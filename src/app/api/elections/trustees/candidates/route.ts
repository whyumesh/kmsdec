import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { retryPrismaOperation } from '@/lib/prisma-retry'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Get zone filter from query parameter (optional)
    const { searchParams } = new URL(request.url)
    const zoneId = searchParams.get('zoneId')
    
    // Build where clause - if zoneId is provided, filter by zone, otherwise get all active voters
    const whereClause: any = {
      isActive: true
    }
    
    if (zoneId) {
      whereClause.trusteeZoneId = zoneId
    }

    // Get all voters from the voter list as they are all potential trustee candidates
    const voters = await retryPrismaOperation(async () => {
      return await prisma.voter.findMany({
        where: whereClause,
        include: {
          trusteeZone: {
            select: {
              id: true,
              name: true,
              nameGujarati: true,
              seats: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    })

    // Format voters as trustee candidates
    const candidates = voters.map(voter => ({
      id: voter.id,
      name: voter.name,
      voterId: voter.voterId,
      region: voter.region,
      phone: voter.phone,
      email: voter.email,
      age: voter.age,
      gender: voter.gender,
      mulgam: voter.mulgam,
      isActive: voter.isActive,
      isEligible: true, // All active voters are eligible for trustees
      zone: voter.trusteeZone ? {
        id: voter.trusteeZone.id,
        name: voter.trusteeZone.name,
        nameGujarati: voter.trusteeZone.nameGujarati,
        seats: voter.trusteeZone.seats
      } : null
    }))

    return NextResponse.json({
      candidates
    })

  } catch (error) {
    console.error('Error fetching trustee candidates:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Failed to fetch trustee candidates'
    }, { status: 500 })
  }
}
