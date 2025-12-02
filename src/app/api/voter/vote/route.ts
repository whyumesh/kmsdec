import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, JWTError } from '@/lib/jwt'
import { createRateLimitedRoute, rateLimitConfigs } from '@/lib/rate-limit'
import { withCSRFProtection } from '@/lib/csrf'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(request: NextRequest) {
  try {
    const token = request.cookies.get('voter-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let decoded
    try {
      decoded = verifyToken(token)
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const { votes } = await request.json()

    if (!votes || typeof votes !== 'object') {
      return NextResponse.json({ error: 'Invalid vote data' }, { status: 400 })
    }

    // Get voter information
    const voter = await prisma.voter.findUnique({
      where: { id: decoded.userId } // Use id instead of userId since token contains voter.id
    })

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 })
    }

    if (voter.hasVoted) {
      return NextResponse.json({ error: 'You have already voted' }, { status: 400 })
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Create vote records
    const votePromises = Object.entries(votes).map(async ([positionId, candidateId]) => {
      // Verify candidate exists and is approved in any of the candidate tables
      let candidate = null;
      try {
        candidate = await prisma.yuvaPankhCandidate.findUnique({
          where: { id: candidateId as string }
        });
      } catch (error) {
        try {
          candidate = await prisma.karobariCandidate.findUnique({
            where: { id: candidateId as string }
          });
        } catch (error) {
          try {
            candidate = await prisma.trusteeCandidate.findUnique({
              where: { id: candidateId as string }
            });
          } catch (error) {
            // Candidate not found in any table
          }
        }
      }

      if (!candidate || candidate.status !== 'APPROVED') {
        throw new Error(`Invalid candidate: ${candidateId}`)
      }

      return prisma.vote.create({
        data: {
          voterId: voter.id,
          yuvaPankhCandidateId: candidateId as string,
          electionId: 'yuva-pank-2024',
          ipAddress,
          userAgent
        }
      })
    })

    await Promise.all(votePromises)

    // Mark voter as having voted
    await prisma.voter.update({
      where: { id: voter.id },
      data: { hasVoted: true }
    })

    return NextResponse.json({ 
      message: 'Vote cast successfully' 
    })

  } catch (error) {
    console.error('Error casting vote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const POST = createRateLimitedRoute(
  withCSRFProtection(handler), 
  rateLimitConfigs.voting
)
