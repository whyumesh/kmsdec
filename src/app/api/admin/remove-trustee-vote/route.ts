import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'
import { handleError } from '@/lib/error-handler'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


// Remove latest trustee vote (no auth required for admin use)
export async function DELETE(request: NextRequest) {
  try {
    // Find the most recent trustee vote
    const latestVote = await prisma.vote.findFirst({
      where: {
        trusteeCandidateId: { not: null }
      },
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        voter: {
          select: {
            id: true,
            name: true,
            voterId: true
          }
        },
        trusteeCandidate: {
          include: {
            zone: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    if (!latestVote) {
      return NextResponse.json({ 
        success: false,
        message: 'No trustee votes found to remove'
      })
    }

    const voterInfo = {
      name: latestVote.voter.name,
      voterId: latestVote.voter.voterId
    }

    // Delete this vote
    await prisma.vote.delete({
      where: {
        id: latestVote.id
      }
    })

    // Check if voter has any other votes
    const remainingVotes = await prisma.vote.count({
      where: { voterId: latestVote.voterId }
    })

    // Check if voter has any other trustee votes
    const remainingTrusteeVotes = await prisma.vote.count({
      where: { 
        voterId: latestVote.voterId,
        trusteeCandidateId: { not: null }
      }
    })

    let hasVotedReset = false
    if (remainingVotes === 0) {
      // Reset hasVoted flag if no votes remain
      await prisma.voter.update({
        where: { id: latestVote.voterId },
        data: { hasVoted: false }
      })
      hasVotedReset = true
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully removed the latest trustee vote',
      removed: {
        voteId: latestVote.id,
        voter: voterInfo,
        trustee: latestVote.trusteeCandidate?.name || 'Unknown',
        zone: latestVote.trusteeCandidate?.zone?.name || 'Unknown',
        timestamp: latestVote.timestamp
      },
      remainingTrusteeVotes,
      hasVotedReset
    })

  } catch (error) {
    return handleError(error, {
      endpoint: request.nextUrl.pathname,
      method: request.method
    })
  }
}

// Remove all trustee votes for authenticated user
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('voter-token')?.value || request.cookies.get('admin-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded.userId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 })
    }

    // Find the voter
    const voter = await prisma.voter.findUnique({
      where: { id: decoded.userId },
      include: {
        votes: {
          where: {
            trusteeCandidateId: { not: null }
          },
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    })

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 })
    }

    if (voter.votes.length === 0) {
      return NextResponse.json({ 
        message: 'No trustee votes found to remove',
        removed: false
      })
    }

    // Delete all trustee votes for this voter
    const deletedVotes = await prisma.vote.deleteMany({
      where: {
        voterId: voter.id,
        trusteeCandidateId: { not: null }
      }
    })

    // Check if voter has any other votes
    const remainingVotes = await prisma.vote.count({
      where: { voterId: voter.id }
    })

    // Reset hasVoted flag if no votes remain
    if (remainingVotes === 0) {
      await prisma.voter.update({
        where: { id: voter.id },
        data: { hasVoted: false }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${deletedVotes.count} trustee vote(s)`,
      removed: deletedVotes.count,
      hasVotedReset: remainingVotes === 0
    })

  } catch (error) {
    return handleError(error, {
      endpoint: request.nextUrl.pathname,
      method: request.method
    })
  }
}

