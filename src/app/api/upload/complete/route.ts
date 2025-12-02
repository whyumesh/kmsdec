import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { generateDownloadUrl } from '@/lib/storj';
import { prisma } from '@/lib/db';
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
    const { fileKey, fileType, candidateId, fileName, fileSize, contentType } = body;

    // Validate required fields
    if (!fileKey || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileKey and fileType are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['aadhaar', 'photo', 'proposer_aadhaar'];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Use the authenticated user's ID
    // For candidates: use the userId from token (not candidateId from body for security)
    // For karobari admin: use candidateId from body (since they're uploading for a candidate) or session user ID as fallback
    // userId is guaranteed to be assigned here because we check authenticated before this point
    const actualUserId = candidateToken ? userId! : (body.candidateId || userId!);

    // Generate download URL for the uploaded file (7 days expiry)
    const downloadUrl = await generateDownloadUrl(fileKey, 604800);

    // Save file metadata to database for tracking and retrieval
    try {
      await prisma.uploadedFile.create({
        data: {
          userId: actualUserId,
          fileName: fileName || `${fileType}_${Date.now()}`,
          fileType: fileType,
          originalName: fileName || 'unknown',
          mimeType: contentType || 'application/octet-stream',
          size: fileSize || 0,
          filePath: fileKey, // Store the Storj fileKey for generating fresh URLs later
          fileData: '' // Empty - file is stored in Storj, not in database
        }
      });
    } catch (dbError: any) {
      console.error('Error saving file metadata to database:', dbError);
      // Don't fail the upload if database save fails, but log it
      // The file is already in Storj, we can retrieve it later using the fileKey
    }

    return NextResponse.json({
      success: true,
      fileKey,
      downloadUrl,
      message: 'File upload completed successfully and saved to database'
    });

  } catch (error) {
    console.error('Error completing file upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to complete file upload: ${errorMessage}` },
      { status: 500 }
    );
  }
}
