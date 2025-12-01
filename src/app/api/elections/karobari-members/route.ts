import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get the Karobari Members election
    const election = await prisma.election.findFirst({
      where: { type: 'KAROBARI_MEMBERS' },
      orderBy: { createdAt: 'desc' }
    })

    if (!election) {
      return NextResponse.json({ 
        error: 'Karobari Members election not found' 
      }, { status: 404 })
    }

    // Get basic statistics
    const candidateCount = await prisma.karobariCandidate.count({
      where: { status: 'APPROVED' }
    })

    const totalCandidates = await prisma.karobariCandidate.count()

    return NextResponse.json({
      election: {
        id: election.id,
        title: election.title,
        description: election.description,
        type: election.type,
        startDate: election.startDate,
        endDate: election.endDate,
        status: election.status,
        voterMinAge: election.voterMinAge,
        voterMaxAge: election.voterMaxAge,
        candidateMinAge: election.candidateMinAge,
        candidateMaxAge: election.candidateMaxAge,
        isOnlineNomination: election.isOnlineNomination,
        voterJurisdiction: election.voterJurisdiction,
        candidateJurisdiction: election.candidateJurisdiction
      },
      statistics: {
        totalCandidates,
        approvedCandidates: candidateCount,
        pendingCandidates: totalCandidates - candidateCount
      }
    })

  } catch (error) {
    console.error('Error fetching Karobari Members election:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch election information' 
    }, { status: 500 })
  }
}
