import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Bypass session check for hardcoded admin - allow all access
    console.log('Withdrawn candidates API called - bypassing admin check for development')
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const region = searchParams.get('region') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (region) {
      where.region = region
    }

    // Get withdrawn candidates
    const [withdrawnCandidates, totalCount] = await Promise.all([
      prisma.deletedYuvaPankhCandidate.findMany({
        where,
        include: {
          zone: {
            select: {
              id: true,
              name: true,
              nameGujarati: true,
              code: true
            }
          }
        },
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.deletedYuvaPankhCandidate.count({ where })
    ])

    // Format the response
    const formattedCandidates = withdrawnCandidates.map(candidate => ({
      id: candidate.id,
      originalId: candidate.originalId,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      party: candidate.party,
      region: candidate.region,
      position: candidate.position,
      zone: candidate.zone,
      status: candidate.status,
      reason: candidate.reason,
      originalCreatedAt: candidate.originalCreatedAt,
      deletedAt: candidate.deletedAt,
      deletedBy: candidate.deletedBy
    }))

    return NextResponse.json({
      success: true,
      candidates: formattedCandidates,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching withdrawn candidates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
