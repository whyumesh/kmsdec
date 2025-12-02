import { NextRequest, NextResponse } from 'next/server';
import { isStorjConfigured, storjClient } from '@/lib/storj';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


/**
 * Utility endpoint to verify Storj documents after account reactivation
 * Lists all files in Storj bucket and cross-references with database
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication (add your auth logic here)
    // For now, allowing for verification purposes
    
    // Check if Storj is configured
    if (!isStorjConfigured()) {
      return NextResponse.json({
        status: 'error',
        message: 'Storj is not configured. Please add STORJ_ACCESS_KEY_ID and STORJ_SECRET_ACCESS_KEY to your environment variables.',
        configured: false
      }, { status: 503 });
    }

    if (!storjClient) {
      return NextResponse.json({
        status: 'error',
        message: 'Storj client not initialized',
        configured: false
      }, { status: 503 });
    }

    const bucketName = process.env.STORJ_BUCKET_NAME || 'kms-election-files';
    const allFiles: string[] = [];
    let continuationToken: string | undefined;

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
          const fileKeys = response.Contents
            .map((obj: any) => obj.Key)
            .filter((key: string) => key && !key.endsWith('/'));
          allFiles.push(...fileKeys);
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      // Get file references from database
      const dbFiles = await prisma.uploadedFile.findMany({
        where: {
          filePath: {
            startsWith: 'nominations/'
          }
        },
        select: {
          id: true,
          filePath: true,
          fileName: true,
          fileType: true,
          originalName: true,
          uploadedAt: true,
          userId: true
        },
        orderBy: {
          uploadedAt: 'desc'
        }
      });

      // Match database records with Storj files
      const matchedFiles = dbFiles.map(dbFile => {
        const fileExists = allFiles.some(storjKey => 
          storjKey === dbFile.filePath || 
          storjKey.includes(dbFile.filePath) ||
          dbFile.filePath.includes(storjKey)
        );
        
        return {
          ...dbFile,
          existsInStorj: fileExists,
          storjKey: allFiles.find(key => 
            key === dbFile.filePath || 
            key.includes(dbFile.filePath) ||
            dbFile.filePath.includes(key)
          ) || null
        };
      });

      // Find orphaned Storj files (in Storj but not in database)
      const dbFilePaths = new Set(dbFiles.map(f => f.filePath));
      const orphanedFiles = allFiles.filter(key => {
        return !Array.from(dbFilePaths).some(dbPath => 
          key === dbPath || 
          key.includes(dbPath) ||
          dbPath.includes(key)
        );
      });

      const stats = {
        totalStorjFiles: allFiles.length,
        totalDatabaseRecords: dbFiles.length,
        matchedFiles: matchedFiles.filter(f => f.existsInStorj).length,
        missingInStorj: matchedFiles.filter(f => !f.existsInStorj).length,
        orphanedInStorj: orphanedFiles.length
      };

      return NextResponse.json({
        status: 'success',
        message: 'Storj document verification completed',
        configured: true,
        stats,
        files: {
          matched: matchedFiles,
          orphaned: orphanedFiles.slice(0, 50) // Limit to first 50 orphaned files
        },
        summary: {
          allDocumentsRetrievable: stats.missingInStorj === 0,
          warning: stats.missingInStorj > 0 
            ? `${stats.missingInStorj} database records reference files not found in Storj. These may have been deleted or moved.`
            : null
        }
      });

    } catch (storjError: any) {
      console.error('Error listing Storj files:', storjError);
      
      // Check if it's an authentication/access error
      if (storjError.message?.includes('403') || 
          storjError.message?.includes('AccessDenied') ||
          storjError.message?.includes('InvalidAccessKeyId')) {
        return NextResponse.json({
          status: 'error',
          message: 'Storj access denied. Please check: 1) Your credentials are correct, 2) Your account is active, 3) Your access grant has proper permissions',
          configured: true,
          error: storjError.message,
          troubleshooting: [
            'Verify your STORJ_ACCESS_KEY_ID and STORJ_SECRET_ACCESS_KEY are correct',
            'Check that your Storj account is active and paid',
            'Ensure your access grant has read/list permissions for the bucket',
            'Verify the bucket name is correct: ' + bucketName
          ]
        }, { status: 403 });
      }

      return NextResponse.json({
        status: 'error',
        message: 'Failed to list Storj files',
        configured: true,
        error: storjError instanceof Error ? storjError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error during verification',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

