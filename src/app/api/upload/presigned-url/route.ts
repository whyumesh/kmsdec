import { NextRequest, NextResponse } from 'next/server';
import { generateUploadUrl, generateFileKey, validateFile } from '@/lib/storj';
import { verifyToken } from '@/lib/jwt';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function POST(request: NextRequest) {
  try {
    // Check authentication - support both candidate-token and NextAuth session
    const candidateToken = request.cookies.get('candidate-token')?.value;
    const session = await getServerSession(authOptions);
    
    let userId: string;
    let authenticated = false;

    // Try candidate-token first
    if (candidateToken) {
      try {
        const decoded = verifyToken(candidateToken);
        if (decoded.role === 'CANDIDATE') {
          userId = decoded.userId;
          authenticated = true;
        }
      } catch (error) {
        // Token invalid, continue to check session
      }
    }

    // Try NextAuth session for karobari admin
    if (!authenticated && session && session.user.role === 'KAROBARI_ADMIN') {
      userId = session.user.id;
      authenticated = true;
    }

    if (!authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login as a candidate or karobari admin' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { candidateId, fileType, fileName, fileSize, contentType } = body;

    // Validate required fields
    if (!fileType || !fileName || !fileSize || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileType, fileName, fileSize, and contentType are required' },
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

    // Create a mock file object for validation
    const mockFile = {
      name: fileName,
      size: fileSize,
      type: contentType
    } as File;

    const validation = validateFile(mockFile, 5); // 5MB max
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Use the authenticated user's ID
    // For candidates: use the userId from token (not candidateId from body for security)
    // For karobari admin: use candidateId from body (since they're uploading for a candidate) or session user ID as fallback
    // userId is guaranteed to be assigned here because we check authenticated before this point
    const actualUserId = candidateToken ? userId! : (body.candidateId || userId!);

    // Generate file key using the actual user ID
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const fileKey = generateFileKey(actualUserId, fileType as 'aadhaar' | 'photo' | 'proposer_aadhaar', fileExtension);

    // Validate Storj configuration before attempting upload
    if (!process.env.STORJ_ACCESS_KEY_ID || !process.env.STORJ_SECRET_ACCESS_KEY) {
      console.error('Storj credentials not configured');
      return NextResponse.json(
        { 
          error: 'Storj storage is not configured. Please contact the administrator.',
          details: 'STORJ_ACCESS_KEY_ID and STORJ_SECRET_ACCESS_KEY environment variables are required.'
        },
        { status: 503 }
      );
    }

    // Generate pre-signed URL
    try {
      const uploadUrl = await generateUploadUrl(fileKey, contentType, 604800); // 7 days expiry (maximum)

      return NextResponse.json({
        success: true,
        uploadUrl,
        fileKey,
        expiresIn: 604800
      });
    } catch (uploadError) {
      console.error('Failed to generate upload URL:', uploadError);
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
      return NextResponse.json(
        { 
          error: `Failed to generate upload URL: ${errorMessage}`,
          details: 'Please ensure Storj is properly configured and accessible.'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
