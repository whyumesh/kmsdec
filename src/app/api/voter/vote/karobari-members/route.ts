import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isEligibleToVote } from '@/lib/age-validation'
import { verifyToken, JWTError } from '@/lib/jwt'
import { handleError } from '@/lib/error-handler'
import { getOrCreateKarobariNotaCandidate } from '@/lib/nota'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function POST(request: NextRequest) {
  try {
    const { votes } = await request.json()
    
    if (!votes || typeof votes !== 'object') {
      return NextResponse.json({ error: 'Invalid vote data' }, { status: 400 })
    }

    // Get voter from JWT token
    const token = request.cookies.get('voter-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify JWT token
    let decoded
    try {
      decoded = verifyToken(token)
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Find voter with user data
    const voter = await prisma.voter.findUnique({
      where: { id: decoded.userId }, // Use id instead of userId since token contains voter.id
      include: {
        user: true,
        votes: true
      }
    })

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 })
    }

    // Get Karobari Members election - must be ACTIVE (frozen if not ACTIVE)
    const election = await prisma.election.findFirst({
      where: { type: 'KAROBARI_MEMBERS' }
    })

    if (!election) {
      return NextResponse.json({ error: 'Karobari Members election not found' }, { status: 404 })
    }

    // Only allow voting while election is ACTIVE
    if (election.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Karobari Members election is currently frozen. Voting is not available at this time.' 
      }, { status: 403 })
    }

    const existingKarobariVotes = await prisma.vote.count({
      where: {
        voterId: voter.id,
        electionId: election.id
      }
    })

    if (existingKarobariVotes > 0) {
      return NextResponse.json({ error: 'Already voted in Karobari Members election' }, { status: 400 })
    }

    // Check age eligibility for voting
    const eligibility = isEligibleToVote(
      {
        age: voter.user?.age || voter.age,
        dateOfBirth: voter.user?.dateOfBirth || (voter.dob ? new Date(voter.dob) : null),
        jurisdiction: voter.user?.jurisdiction || 'LOCAL'
      },
      {
        voterMinAge: election.voterMinAge,
        voterMaxAge: election.voterMaxAge,
        voterJurisdiction: election.voterJurisdiction,
        candidateMinAge: election.candidateMinAge,
        candidateMaxAge: election.candidateMaxAge,
        candidateJurisdiction: election.candidateJurisdiction
      }
    )

    if (!eligibility.eligible) {
      return NextResponse.json({ 
        error: eligibility.reason || 'You are not eligible to vote in this election' 
      }, { status: 403 })
    }

    // Get candidates for Karobari Members election
    const candidates = await prisma.karobariCandidate.findMany({
      where: {
        status: 'APPROVED'
      }
    })

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No candidates found for Karobari Members election' }, { status: 404 })
    }

    // Validate that all candidates are valid
    const candidateIds = new Set(candidates.map(c => c.id))
    const parsedSelections: Array<{ candidateId?: string; isNota: boolean }> = []

    for (const selection of Object.values(votes)) {
      const selectionArray = Array.isArray(selection) ? selection : [selection]
      selectionArray.forEach(value => {
        if (typeof value !== 'string') return
        if (value.startsWith('NOTA_')) {
          parsedSelections.push({ isNota: true })
        } else {
          parsedSelections.push({ candidateId: value, isNota: false })
        }
      })
    }

    if (parsedSelections.length === 0) {
      return NextResponse.json({ error: 'No selections were submitted.' }, { status: 400 })
    }

    for (const selection of parsedSelections) {
      if (!selection.isNota && selection.candidateId && !candidateIds.has(selection.candidateId)) {
        return NextResponse.json({ error: `Invalid candidate: ${selection.candidateId}` }, { status: 400 })
      }
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? request.ip
      ?? 'unknown'
    const userAgent = request.headers.get('user-agent') ?? 'unknown'

    await prisma.$transaction(async (tx) => {
      for (const selection of parsedSelections) {
        let candidateId = selection.candidateId
        if (selection.isNota) {
          candidateId = await getOrCreateKarobariNotaCandidate(voter.karobariZoneId!)
        }

        await tx.vote.create({
          data: {
            voterId: voter.id,
            karobariCandidateId: candidateId as string,
            electionId: election.id,
            timestamp: new Date(),
            ipAddress,
            userAgent
          }
        })
      }
    })

    return NextResponse.json({ 
      message: 'Vote submitted successfully',
      votesCount: parsedSelections.length,
      notaCount: parsedSelections.filter(selection => selection.isNota).length
    })

  } catch (error) {
    return handleError(error, { 
      endpoint: request.nextUrl.pathname,
      method: request.method 
    })
  }
}
