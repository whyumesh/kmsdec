import { NextRequest, NextResponse } from 'next/server';
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

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Test file validation
    const fileSize = file.size;
    const fileName = file.name;
    const fileType = file.type;

    return NextResponse.json({
      success: true,
      message: 'File validation test passed',
      fileInfo: {
        name: fileName,
        size: fileSize,
        type: fileType,
        sizeInMB: (fileSize / 1024 / 1024).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Upload test error:', error);
    return NextResponse.json(
      { error: 'Test failed' },
      { status: 500 }
    );
  }
}
