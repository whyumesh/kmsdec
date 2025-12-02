import { NextRequest, NextResponse } from 'next/server';
import { isStorjConfigured, storjClient } from '@/lib/storj';
import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Note: Removed unused import to avoid circular dependency

/**
 * Sync and repair file paths between Storj and database
 * This endpoint:
 * 1. Lists all files in Storj bucket
 * 2. Finds corresponding database records
 * 3. Updates file paths to match actual Storj keys
 * 4. Reports any missing files
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication (add your auth logic here if needed)
    
    if (!isStorjConfigured() || !storjClient) {
      return NextResponse.json({
        status: 'error',
        message: 'Storj is not configured',
        configured: false
      }, { status: 503 });
    }

    const bucketName = process.env.STORJ_BUCKET_NAME || 'kmselection';
    const allStorjFiles: Array<{ key: string; size: number; lastModified: Date }> = [];
    let continuationToken: string | undefined;

    console.log(`Starting Storj file sync for bucket: ${bucketName}`);

    // List all files in Storj bucket
    try {
      do {
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: 'nominations/',
          ContinuationToken: continuationToken,
          MaxKeys: 1000
        });

        const response = await storjClient.send(command);
        
        if (response.Contents) {
          response.Contents.forEach((obj: any) => {
            if (obj.Key && !obj.Key.endsWith('/')) {
              allStorjFiles.push({
                key: obj.Key,
                size: obj.Size || 0,
                lastModified: obj.LastModified || new Date()
              });
            }
          });
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      console.log(`Found ${allStorjFiles.length} files in Storj bucket`);

      // Get all database records with file paths
      const dbFiles = await prisma.uploadedFile.findMany({
        where: {
          OR: [
            { filePath: { startsWith: 'nominations/' } },
            { filePath: { startsWith: 'kmselection/' } },
            { filePath: { contains: 'nominations/' } }
          ]
        },
        select: {
          id: true,
          filePath: true,
          fileName: true,
          fileType: true,
          userId: true,
          originalName: true
        }
      });

      console.log(`Found ${dbFiles.length} database records to check`);

      const results = {
        totalStorjFiles: allStorjFiles.length,
        totalDatabaseRecords: dbFiles.length,
        matched: 0,
        updated: 0,
        missing: [] as any[],
        orphaned: [] as string[]
      };

      // Create a map of Storj files by normalized key
      const storjFileMap = new Map<string, string>();
      allStorjFiles.forEach(file => {
        // Normalize the key (remove bucket name prefix if present)
        const normalizedKey = file.key
          .replace(/^kmselection\/kmselection\//, 'kmselection/')
          .replace(/^kmselection\/nominations\//, 'nominations/')
          .replace(/^nominations\/nominations\//, 'nominations/');
        storjFileMap.set(normalizedKey, file.key);
      });

      // Process each database record
      for (const dbFile of dbFiles) {
        let filePath = dbFile.filePath;
        
        // Normalize the stored path
        let normalizedPath = filePath
          .replace(/^kmselection\/kmselection\//, 'kmselection/')
          .replace(/^kmselection\/nominations\//, 'nominations/')
          .replace(/^nominations\/nominations\//, 'nominations/');

        // Try to find matching file in Storj
        let matchingStorjKey: string | null = null;

        // Direct match
        if (storjFileMap.has(normalizedPath)) {
          matchingStorjKey = storjFileMap.get(normalizedPath)!;
          results.matched++;
        } else {
          // Try partial matching (file name matching)
          const fileName = normalizedPath.split('/').pop() || '';
          for (const [storjKey, actualKey] of storjFileMap.entries()) {
            if (storjKey.includes(fileName) || fileName.includes(storjKey.split('/').pop() || '')) {
              matchingStorjKey = actualKey;
              results.matched++;
              break;
            }
          }
        }

        if (matchingStorjKey) {
          // Update database with correct path (without bucket prefix)
          const correctPath = matchingStorjKey.startsWith(`${bucketName}/`)
            ? matchingStorjKey.substring(bucketName.length + 1)
            : matchingStorjKey;

          if (dbFile.filePath !== correctPath) {
            await prisma.uploadedFile.update({
              where: { id: dbFile.id },
              data: { filePath: correctPath }
            });
            results.updated++;
            console.log(`Updated file path: ${dbFile.filePath} -> ${correctPath}`);
          }
        } else {
          // File not found in Storj
          results.missing.push({
            id: dbFile.id,
            filePath: dbFile.filePath,
            fileName: dbFile.fileName,
            fileType: dbFile.fileType,
            userId: dbFile.userId
          });
        }
      }

      // Find orphaned files (in Storj but not in database)
      const dbFilePaths = new Set(dbFiles.map(f => {
        const normalized = f.filePath
          .replace(/^kmselection\/kmselection\//, 'kmselection/')
          .replace(/^kmselection\/nominations\//, 'nominations/');
        return normalized;
      }));

      allStorjFiles.forEach(file => {
        const normalized = file.key
          .replace(/^kmselection\/kmselection\//, 'kmselection/')
          .replace(/^kmselection\/nominations\//, 'nominations/');
        
        let found = false;
        for (const dbPath of dbFilePaths) {
          if (normalized.includes(dbPath) || dbPath.includes(normalized) || 
              file.key.split('/').pop() === dbPath.split('/').pop()) {
            found = true;
            break;
          }
        }
        
        if (!found) {
          results.orphaned.push(file.key);
        }
      });

      return NextResponse.json({
        status: 'success',
        message: 'Storj file sync completed',
        results: {
          ...results,
          summary: {
            filesRecoverable: results.matched,
            filesMissing: results.missing.length,
            filesUpdated: results.updated,
            orphanedFiles: results.orphaned.length
          }
        },
        nextSteps: results.missing.length > 0
          ? 'Some files are missing from Storj. Check if they exist in database as base64 or local storage.'
          : 'All files are synced and recoverable!'
      });

    } catch (storjError: any) {
      console.error('Error syncing Storj files:', storjError);
      
      return NextResponse.json({
        status: 'error',
        message: 'Failed to sync Storj files',
        error: storjError instanceof Error ? storjError.message : 'Unknown error',
        details: storjError
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error during sync',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Quick sync - just verify and report without updating
 */
export async function GET(request: NextRequest) {
  try {
    if (!isStorjConfigured() || !storjClient) {
      return NextResponse.json({
        status: 'error',
        message: 'Storj is not configured'
      }, { status: 503 });
    }

    const bucketName = process.env.STORJ_BUCKET_NAME || 'kmselection';
    
    // Quick check - just count files
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'nominations/',
      MaxKeys: 1
    });

    await storjClient.send(command);

    const dbCount = await prisma.uploadedFile.count({
      where: {
        OR: [
          { filePath: { startsWith: 'nominations/' } },
          { filePath: { startsWith: 'kmselection/' } }
        ]
      }
    });

    return NextResponse.json({
      status: 'success',
      message: 'Storj is accessible',
      bucket: bucketName,
      databaseRecords: dbCount,
      note: 'Use POST /api/admin/sync-storj-files to perform full sync and repair'
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to verify Storj',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

