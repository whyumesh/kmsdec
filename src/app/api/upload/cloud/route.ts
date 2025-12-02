import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;
    const candidateId = formData.get('candidateId') as string;

    if (!file || !fileType || !candidateId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['aadhaar', 'photo', 'proposer_aadhaar'];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Convert file to base64 for storage in database
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Create virtual file path
    const cloudFilePath = `nominations/${candidateId}/${fileType}_${Date.now()}_cloud`;
    
    // Store file in database
    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        userId: candidateId,
        fileName: `${fileType}_${Date.now()}`,
        fileType: fileType,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        fileData: base64,
        filePath: cloudFilePath
      }
    });

    return NextResponse.json({
      success: true,
      filePath: cloudFilePath,
      downloadUrl: `/api/upload/view?path=${encodeURIComponent(cloudFilePath)}`,
      message: 'File uploaded to database storage',
      fileId: uploadedFile.id
    });

  } catch (error) {
    console.error('Error uploading file to cloud:', error);
    return NextResponse.json(
      { error: 'Failed to upload file to cloud storage' },
      { status: 500 }
    );
  }
}
