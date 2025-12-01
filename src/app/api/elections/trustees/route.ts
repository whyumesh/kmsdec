import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get the Trustees election
    const election = await prisma.election.findFirst({
      where: { type: 'TRUSTEES' },
      orderBy: { createdAt: 'desc' }
    })

    if (!election) {
      return NextResponse.json({ 
        error: 'Trustees election not found' 
      }, { status: 404 })
    }

    // Get basic statistics
    const candidateCount = await prisma.trusteeCandidate.count({
      where: { status: 'APPROVED' }
    })

    const totalCandidates = await prisma.trusteeCandidate.count()

    // Get zone statistics
    const zones = await prisma.zone.findMany({
      where: { electionType: 'TRUSTEES' },
      select: {
        id: true,
        name: true,
        nameGujarati: true,
        seats: true
      }
    })

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
        pendingCandidates: totalCandidates - candidateCount,
        totalZones: zones.length,
        totalSeats: zones.reduce((sum, zone) => sum + zone.seats, 0)
      },
      zones: zones
    })

  } catch (error) {
    console.error('Error fetching Trustees election:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch election information' 
    }, { status: 500 })
  }
}

