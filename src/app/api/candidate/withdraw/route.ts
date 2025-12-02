import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, JWTError } from '@/lib/jwt'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated using JWT token (same as candidate dashboard)
    const token = request.cookies.get("candidate-token")?.value

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtError) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      )
    }

    const { reason } = await request.json()
    
    // Find the candidate's nomination
    const candidate = await prisma.yuvaPankhCandidate.findFirst({
      where: {
        userId: decoded.userId
      },
      include: {
        zone: true
      }
    })

    if (!candidate) {
      return NextResponse.json(
        { error: 'No nomination found for this user' },
        { status: 404 }
      )
    }

    // Check if candidate has already withdrawn
    if (candidate.status === 'WITHDRAWN') {
      return NextResponse.json(
        { error: 'Nomination has already been withdrawn' },
        { status: 400 }
      )
    }

    // Check if candidate is already approved (prevent withdrawal after approval)
    if (candidate.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Cannot withdraw after nomination has been approved' },
        { status: 400 }
      )
    }

    // Check if candidate is rejected (prevent withdrawal after rejection)
    if (candidate.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Cannot withdraw a rejected nomination. Please resubmit instead.' },
        { status: 400 }
      )
    }

    // Create deleted candidate record using raw query
    const deletedCandidate = await prisma.$queryRaw`
      INSERT INTO deleted_yuva_pankh_candidates (
        id, "originalId", "userId", name, email, phone, party, manifesto, 
        status, "rejectionReason", region, position, experience, education, 
        "zoneId", "isOnlineRegistration", "originalCreatedAt", "originalUpdatedAt", 
        "deletedBy", reason, "deletedAt"
      )
      VALUES (
        gen_random_uuid()::text,
        ${candidate.id},
        ${candidate.userId || null},
        ${candidate.name},
        ${candidate.email || null},
        ${candidate.phone || null},
        ${candidate.party || null},
        ${candidate.manifesto || null},
        'WITHDRAWN',
        ${candidate.rejectionReason || null},
        ${candidate.region},
        ${candidate.position},
        ${candidate.experience || null},
        ${candidate.education || null},
        ${candidate.zoneId || null},
        ${candidate.isOnlineRegistration},
        ${candidate.createdAt},
        ${candidate.updatedAt},
        ${decoded.userId},
        ${reason || 'Candidate withdrew nomination'},
        NOW()
      )
      RETURNING *
    ` as any[]

    // Delete the original candidate record
    await prisma.yuvaPankhCandidate.delete({
      where: {
        id: candidate.id
      }
    })

    // Also delete any votes for this candidate
    await prisma.vote.deleteMany({
      where: {
        yuvaPankhCandidateId: candidate.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Nomination withdrawn successfully',
      deletedCandidate: {
        id: deletedCandidate[0].id,
        name: deletedCandidate[0].name,
        withdrawnAt: deletedCandidate[0].deletedAt,
        reason: deletedCandidate[0].reason
      }
    })

  } catch (error) {
    console.error('Error withdrawing nomination:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
