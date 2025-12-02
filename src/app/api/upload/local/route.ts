import { NextRequest, NextResponse } from 'next/server';
import { saveFile, validateUploadPath } from '@/lib/file-upload';
import { verifyToken } from '@/lib/jwt';

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

    // Save file locally
    console.log('Using local upload path for candidate:', candidateId, 'fileType:', fileType);
    
    const result = await saveFile(file, `nominations/${candidateId}`, `${fileType}_${Date.now()}`);
    
    if (!result.success) {
      console.error('Failed to save file locally:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to save file' },
        { status: 500 }
      );
    }

    console.log('File saved locally at:', result.filePath);

    return NextResponse.json({
      success: true,
      filePath: result.filePath,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading file locally:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
