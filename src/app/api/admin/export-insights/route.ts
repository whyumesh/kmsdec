import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Gracefully handle missing database URL (e.g., during build)
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not available, returning empty export')
    return NextResponse.json({
      error: 'Database not available',
      message: 'Export functionality requires database connection'
    }, { status: 503 })
  }

  try {
    console.log('Exporting election insights...')
    console.log('Request URL:', request.url)
    console.log('Timestamp:', new Date().toISOString())
    console.log('Fetching fresh data from database...')

    // Collect all data for JSON response (Excel export removed to reduce bundle size)
    const exportData: any = {
      summary: {},
      votersByRegion: [],
      yuvaPankhResults: [],
      karobariResults: [],
      trusteeResults: [],
      zoneTurnout: [],
      candidateStatus: [],
      votingData: [],
      voterParticipation: [],
      voterElectionStatus: []
    }

    // ============================================
    // SUMMARY STATISTICS
    // ============================================
    const [
      totalVoters,
      activeVoters,
      totalVotes,
      totalYuvaPankhCandidates,
      totalYuvaPankhNominees,
      totalKarobariCandidates,
      totalTrusteeCandidates,
      pendingYuvaPankhCandidates,
      pendingYuvaPankhNominees,
      approvedYuvaPankhCandidates,
      approvedYuvaPankhNominees,
      rejectedYuvaPankhCandidates,
      rejectedYuvaPankhNominees,
      pendingKarobari,
      approvedKarobari,
      rejectedKarobari,
      pendingTrustee,
      approvedTrustee,
      rejectedTrustee,
      yuvaPankhVotes,
      karobariVotes,
      trusteeVotes,
      yuvaPankhNotaVotes,
      karobariNotaVotes,
      trusteeNotaVotes
    ] = await Promise.all([
      prisma.voter.count(),
      prisma.voter.count({ where: { isActive: true } }),
      prisma.vote.count(),
      prisma.yuvaPankhCandidate.count(),
      prisma.yuvaPankhNominee.count(),
      prisma.karobariCandidate.count(),
      prisma.trusteeCandidate.count(),
      prisma.yuvaPankhCandidate.count({ where: { status: 'PENDING' } }),
      prisma.yuvaPankhNominee.count({ where: { status: 'PENDING' } }),
      prisma.yuvaPankhCandidate.count({ where: { status: 'APPROVED' } }),
      prisma.yuvaPankhNominee.count({ where: { status: 'APPROVED' } }),
      prisma.yuvaPankhCandidate.count({ where: { status: 'REJECTED' } }),
      prisma.yuvaPankhNominee.count({ where: { status: 'REJECTED' } }),
      prisma.karobariCandidate.count({ where: { status: 'PENDING' } }),
      prisma.karobariCandidate.count({ where: { status: 'APPROVED' } }),
      prisma.karobariCandidate.count({ where: { status: 'REJECTED' } }),
      prisma.trusteeCandidate.count({ where: { status: 'PENDING' } }),
      prisma.trusteeCandidate.count({ where: { status: 'APPROVED' } }),
      prisma.trusteeCandidate.count({ where: { status: 'REJECTED' } }),
      prisma.vote.count({ where: { yuvaPankhCandidateId: { not: null } } }),
      prisma.vote.count({ where: { karobariCandidateId: { not: null } } }),
      prisma.vote.count({ where: { trusteeCandidateId: { not: null } } }),
      prisma.vote.count({ where: { yuvaPankhCandidate: { position: 'NOTA' } } }),
      prisma.vote.count({ where: { karobariCandidate: { position: 'NOTA' } } }),
      prisma.vote.count({ where: { trusteeCandidate: { position: 'NOTA' } } })
    ])

    const pendingYuvaPankh = pendingYuvaPankhCandidates + pendingYuvaPankhNominees
    const approvedYuvaPankh = approvedYuvaPankhCandidates + approvedYuvaPankhNominees
    const rejectedYuvaPankh = rejectedYuvaPankhCandidates + rejectedYuvaPankhNominees

    const votersWithYuvaPankZone = await prisma.voter.count({ where: { yuvaPankZoneId: { not: null } } })
    const votersWithKarobariZone = await prisma.voter.count({ where: { karobariZoneId: { not: null } } })
    const votersWithTrusteeZone = await prisma.voter.count({ where: { trusteeZoneId: { not: null } } })

    const yuvaPankhVotesForCount = await prisma.vote.findMany({
      where: { election: { type: 'YUVA_PANK' } },
      select: { voterId: true }
    })
    const karobariVotesForCount = await prisma.vote.findMany({
      where: { election: { type: 'KAROBARI_MEMBERS' } },
      select: { voterId: true }
    })
    const trusteeVotesForCount = await prisma.vote.findMany({
      where: { election: { type: 'TRUSTEES' } },
      select: { voterId: true }
    })

    const votersVotedYuvaPankh = new Set(yuvaPankhVotesForCount.map(v => v.voterId)).size
    const votersVotedKarobari = new Set(karobariVotesForCount.map(v => v.voterId)).size
    const votersVotedTrustee = new Set(trusteeVotesForCount.map(v => v.voterId)).size

    exportData.summary = {
      totalVoters,
      activeVoters,
      inactiveVoters: totalVoters - activeVoters,
      votersWithYuvaPankZone,
      votersWithKarobariZone,
      votersWithTrusteeZone,
      totalVotes,
      yuvaPankhVotes,
      karobariVotes,
      trusteeVotes,
      yuvaPankhNotaVotes,
      karobariNotaVotes,
      trusteeNotaVotes,
      votersVotedYuvaPankh,
      votersVotedKarobari,
      votersVotedTrustee,
      yuvaPankhTurnout: votersWithYuvaPankZone > 0 ? ((votersVotedYuvaPankh / votersWithYuvaPankZone) * 100).toFixed(2) + '%' : '0%',
      karobariTurnout: votersWithKarobariZone > 0 ? ((votersVotedKarobari / votersWithKarobariZone) * 100).toFixed(2) + '%' : '0%',
      trusteeTurnout: votersWithTrusteeZone > 0 ? ((votersVotedTrustee / votersWithTrusteeZone) * 100).toFixed(2) + '%' : '0%',
      yuvaPankhCandidates: {
        total: totalYuvaPankhCandidates + totalYuvaPankhNominees,
        pending: pendingYuvaPankh,
        approved: approvedYuvaPankh,
        rejected: rejectedYuvaPankh
      },
      karobariCandidates: {
        total: totalKarobariCandidates,
        pending: pendingKarobari,
        approved: approvedKarobari,
        rejected: rejectedKarobari
      },
      trusteeCandidates: {
        total: totalTrusteeCandidates,
        pending: pendingTrustee,
        approved: approvedTrustee,
        rejected: rejectedTrustee
      }
    }

    // ============================================
    // VOTERS BY REGION
    // ============================================
    const votersByRegion = await prisma.voter.groupBy({
      by: ['region'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    })

    for (const regionGroup of votersByRegion) {
      const region = regionGroup.region
      const [yuvaPank, karobari, trustee] = await Promise.all([
        prisma.voter.count({ where: { region, yuvaPankZoneId: { not: null } } }),
        prisma.voter.count({ where: { region, karobariZoneId: { not: null } } }),
        prisma.voter.count({ where: { region, trusteeZoneId: { not: null } } })
      ])

      exportData.votersByRegion.push({
        region: region || 'Unknown',
        total: regionGroup._count.id,
        yuvaPank,
        karobari,
        trustee
      })
    }

    // ============================================
    // ELECTION RESULTS
    // ============================================
    // Yuva Pankh Results
    const yuvaPankhVoteCounts = await prisma.vote.groupBy({
      by: ['yuvaPankhCandidateId'],
      where: { yuvaPankhCandidateId: { not: null } },
      _count: { id: true }
    })

    const yuvaPankhCandidateIds = yuvaPankhVoteCounts.map(v => v.yuvaPankhCandidateId!).filter(Boolean)
    const yuvaCandidates = await prisma.yuvaPankhCandidate.findMany({
      where: { id: { in: yuvaPankhCandidateIds } },
      select: {
        id: true,
        name: true,
        zoneId: true,
        user: { select: { name: true } }
      }
    })

    const yuvaZoneIds = [...new Set(yuvaCandidates.map(c => c.zoneId).filter(Boolean) as string[])]
    const yuvaZones = await prisma.zone.findMany({
      where: { id: { in: yuvaZoneIds } },
      select: { id: true, name: true }
    })
    const yuvaZoneMap = new Map(yuvaZones.map(z => [z.id, z.name]))

    for (const voteCount of yuvaPankhVoteCounts) {
      if (!voteCount.yuvaPankhCandidateId) continue
      const candidate = yuvaCandidates.find(c => c.id === voteCount.yuvaPankhCandidateId)
      if (!candidate) continue

      exportData.yuvaPankhResults.push({
        zone: yuvaZoneMap.get(candidate.zoneId || '') || candidate.zoneId || 'Unknown',
        candidateName: candidate.user?.name || candidate.name || 'Unknown',
        votes: voteCount._count.id
      })
    }

    // Karobari Results
    const karobariVoteCounts = await prisma.vote.groupBy({
      by: ['karobariCandidateId'],
      where: { karobariCandidateId: { not: null } },
      _count: { id: true }
    })

    const karobariCandidateIds = karobariVoteCounts.map(v => v.karobariCandidateId!).filter(Boolean)
    const karobariCandidates = await prisma.karobariCandidate.findMany({
      where: { id: { in: karobariCandidateIds } },
      select: {
        id: true,
        name: true,
        position: true,
        zoneId: true,
        user: { select: { name: true } }
      }
    })

    const karobariZoneIds = [...new Set(karobariCandidates.map(c => c.zoneId).filter(Boolean) as string[])]
    const karobariZones = await prisma.zone.findMany({
      where: { id: { in: karobariZoneIds } },
      select: { id: true, name: true }
    })
    const karobariZoneMap = new Map(karobariZones.map(z => [z.id, z.name]))

    for (const voteCount of karobariVoteCounts) {
      if (!voteCount.karobariCandidateId) continue
      const candidate = karobariCandidates.find(c => c.id === voteCount.karobariCandidateId)
      if (!candidate) continue

      exportData.karobariResults.push({
        zone: karobariZoneMap.get(candidate.zoneId || '') || candidate.zoneId || 'Unknown',
        position: candidate.position || 'Unknown',
        candidateName: candidate.user?.name || candidate.name || 'Unknown',
        votes: voteCount._count.id
      })
    }

    // Trustee Results
    const trusteeVoteCounts = await prisma.vote.groupBy({
      by: ['trusteeCandidateId'],
      where: { trusteeCandidateId: { not: null } },
      _count: { id: true }
    })

    const trusteeCandidateIds = trusteeVoteCounts.map(v => v.trusteeCandidateId!).filter(Boolean)
    const trusteeCandidates = await prisma.trusteeCandidate.findMany({
      where: { id: { in: trusteeCandidateIds } },
      select: {
        id: true,
        name: true,
        zoneId: true,
        user: { select: { name: true } }
      }
    })

    const trusteeZoneIds = [...new Set(trusteeCandidates.map(c => c.zoneId).filter(Boolean) as string[])]
    const trusteeZones = await prisma.zone.findMany({
      where: { id: { in: trusteeZoneIds } },
      select: { id: true, name: true }
    })
    const trusteeZoneMap = new Map(trusteeZones.map(z => [z.id, z.name]))

    for (const voteCount of trusteeVoteCounts) {
      if (!voteCount.trusteeCandidateId) continue
      const candidate = trusteeCandidates.find(c => c.id === voteCount.trusteeCandidateId)
      if (!candidate) continue

      exportData.trusteeResults.push({
        zone: trusteeZoneMap.get(candidate.zoneId || '') || candidate.zoneId || 'Unknown',
        candidateName: candidate.user?.name || candidate.name || 'Unknown',
        votes: voteCount._count.id
      })
    }

    // ============================================
    // ZONE-WISE TURNOUT
    // ============================================
    const allZones = await prisma.zone.findMany({
      where: { isActive: true },
      orderBy: [{ electionType: 'asc' }, { name: 'asc' }]
    })

    for (const zone of allZones) {
      let voterCount = 0
      let voteCount = 0

      if (zone.electionType === 'YUVA_PANK') {
        voterCount = await prisma.voter.count({ where: { yuvaPankZoneId: zone.id } })
        const uniqueVoters = await prisma.vote.findMany({
          where: { yuvaPankhCandidate: { zoneId: zone.id } },
          select: { voterId: true },
          distinct: ['voterId']
        })
        voteCount = uniqueVoters.length
      } else if (zone.electionType === 'KAROBARI_MEMBERS') {
        voterCount = await prisma.voter.count({ where: { karobariZoneId: zone.id } })
        const uniqueVoters = await prisma.vote.findMany({
          where: { karobariCandidate: { zoneId: zone.id } },
          select: { voterId: true },
          distinct: ['voterId']
        })
        voteCount = uniqueVoters.length
      } else if (zone.electionType === 'TRUSTEES') {
        voterCount = await prisma.voter.count({ where: { trusteeZoneId: zone.id } })
        const uniqueVoters = await prisma.vote.findMany({
          where: { trusteeCandidate: { zoneId: zone.id } },
          select: { voterId: true },
          distinct: ['voterId']
        })
        voteCount = uniqueVoters.length
      }

      const turnout = voterCount > 0 ? ((voteCount / voterCount) * 100).toFixed(2) + '%' : '0%'

      exportData.zoneTurnout.push({
        electionType: zone.electionType,
        zoneName: zone.name,
        totalVoters: voterCount,
        votesCast: voteCount,
        turnout,
        seats: zone.seats
      })
    }

    // ============================================
    // CANDIDATE STATUS
    // ============================================
    const yuvaPankhCandidates = await prisma.yuvaPankhCandidate.findMany({
      include: {
        user: { select: { name: true } },
        zone: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    yuvaPankhCandidates.forEach(candidate => {
      exportData.candidateStatus.push({
        electionType: 'YUVA_PANKH',
        zone: candidate.zone?.name || 'N/A',
        name: candidate.user?.name || candidate.name || 'Unknown',
        status: candidate.status,
        position: 'Member',
        region: candidate.region || 'N/A',
        submitted: candidate.createdAt.toLocaleDateString()
      })
    })

    const karobariCandidatesForStatus = await prisma.karobariCandidate.findMany({
      include: {
        user: { select: { name: true } },
        zone: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    karobariCandidatesForStatus.forEach(candidate => {
      exportData.candidateStatus.push({
        electionType: 'KAROBARI',
        zone: candidate.zone?.name || 'N/A',
        name: candidate.user?.name || candidate.name || 'Unknown',
        status: candidate.status,
        position: candidate.position || 'N/A',
        region: candidate.region || 'N/A',
        submitted: candidate.createdAt.toLocaleDateString()
      })
    })

    const trusteeCandidatesForStatus = await prisma.trusteeCandidate.findMany({
      include: {
        user: { select: { name: true } },
        zone: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    trusteeCandidatesForStatus.forEach(candidate => {
      exportData.candidateStatus.push({
        electionType: 'TRUSTEE',
        zone: candidate.zone?.name || 'N/A',
        name: candidate.user?.name || candidate.name || 'Unknown',
        status: candidate.status,
        position: 'Trustee',
        region: candidate.region || 'N/A',
        submitted: candidate.createdAt.toLocaleDateString()
      })
    })

    // ============================================
    // VOTING DATA (Simplified - first 1000 votes)
    // ============================================
    const allVotes = await prisma.vote.findMany({
      select: {
        id: true,
        voterId: true,
        yuvaPankhCandidateId: true,
        karobariCandidateId: true,
        trusteeCandidateId: true,
        timestamp: true,
        ipAddress: true,
        election: {
          select: {
            type: true,
            title: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 1000 // Limit to prevent huge responses
    })

    exportData.votingData = allVotes.map(vote => ({
      voteId: vote.id,
      voterId: vote.voterId,
      electionType: vote.election?.type || 'UNKNOWN',
      electionTitle: vote.election?.title || 'N/A',
      timestamp: vote.timestamp.toISOString(),
      ipAddress: vote.ipAddress || 'N/A'
    }))

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    console.log(`Export completed in ${duration} seconds`)

    return NextResponse.json({
      message: 'Election insights exported successfully',
      data: exportData,
      exportedAt: new Date().toISOString(),
      duration: `${duration}s`
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Error exporting election insights:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({ 
      error: 'Failed to export election insights',
      details: errorMessage,
      message: `Export failed: ${errorMessage}`,
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}
