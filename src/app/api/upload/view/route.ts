import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Check candidate authentication
    const candidateToken = request.cookies.get('candidate-token')?.value;
    if (!candidateToken) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login as a candidate' },
        { status: 401 }
      );
    }

    try {
      const decoded = verifyToken(candidateToken);
      if (decoded.role !== 'CANDIDATE') {
        return NextResponse.json(
          { error: 'Unauthorized - Candidate access required' },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token - Please login again' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Security check: ensure the file path is within uploads directory
    const uploadsDir = process.env.UPLOAD_DIR || './uploads';

    // Clean and normalize the incoming filePath
    let actualFilePath = filePath.trim();
    // Collapse multiple slashes and convert backslashes to forward slashes
    actualFilePath = actualFilePath.replace(/[\/\\]+/g, '/');
    // If the path already starts with uploads/, strip it to avoid uploads/uploads
    if (actualFilePath.startsWith('uploads/')) {
      actualFilePath = actualFilePath.replace(/^uploads\//, '');
    }
    // Ensure path does not start with a slash
    actualFilePath = actualFilePath.replace(/^\//, '');
    // Block traversal or suspicious segments
    if (actualFilePath.includes('..') || actualFilePath.includes('~')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 403 }
      );
    }

    const fullPath = join(process.cwd(), uploadsDir, actualFilePath);
    const normalizedPath = fullPath.replace(/\\/g, '/');
    const normalizedUploadsDir = join(process.cwd(), uploadsDir).replace(/\\/g, '/');

    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 403 }
      );
    }

    // Check if this is a database-stored file
    if (actualFilePath.includes('_cloud')) {
      try {
        const uploadedFile = await prisma.uploadedFile.findFirst({
          where: { filePath: actualFilePath }
        });

        if (uploadedFile) {
          // Convert base64 back to buffer
          const fileBuffer = Buffer.from(uploadedFile.fileData, 'base64');
          
          return new NextResponse(fileBuffer as BodyInit, {
            headers: {
              'Content-Type': uploadedFile.mimeType,
              'Cache-Control': 'private, max-age=3600',
              'Content-Disposition': `inline; filename="${uploadedFile.originalName}"`,
            },
          });
        }
      } catch (dbError) {
        console.error('Error retrieving file from database:', dbError);
      }
    }

    // Check if this is a serverless/mock file
    if (actualFilePath.includes('_serverless') || actualFilePath.includes('_mock')) {
      // Return a placeholder response for serverless environments
      const placeholderText = 'File uploaded in serverless environment - actual file not stored';
      const buffer = Buffer.from(placeholderText, 'utf-8');
      
      return new NextResponse(buffer as BodyInit, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    try {
      const fileBuffer = await readFile(fullPath);
      
      // Determine content type based on file extension
      const extension = actualFilePath.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
      }

      return new NextResponse(fileBuffer as BodyInit, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch (error) {
      console.error('Error reading file:', error);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
