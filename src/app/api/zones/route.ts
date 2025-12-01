import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const electionType = searchParams.get('electionType')

    let zones = await prisma.zone.findMany({
      where: { 
        isActive: true,
        ...(electionType && { electionType })
      },
      orderBy: { name: 'asc' }
    })

    // For Yuva Pankh, mark zones as frozen if they're not KARNATAKA_GOA or RAIGAD
    const zonesWithFrozenFlag = zones.map(zone => {
      if (zone.electionType === 'YUVA_PANK') {
        const isFrozen = zone.code !== 'KARNATAKA_GOA' && zone.code !== 'RAIGAD'
        return {
          ...zone,
          isFrozen
        }
      }
      return {
        ...zone,
        isFrozen: false
      }
    })

    return NextResponse.json({ zones: zonesWithFrozenFlag })

  } catch (error) {
    console.error('Error fetching zones:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


