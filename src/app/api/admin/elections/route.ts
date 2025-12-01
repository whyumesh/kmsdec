import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

// GET - Get all elections
export async function GET(request: NextRequest) {
  try {
    const elections = await prisma.election.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ elections })
  } catch (error) {
    console.error('Error fetching elections:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch elections' 
    }, { status: 500 })
  }
}

// PATCH - Update election status
export async function PATCH(request: NextRequest) {
  try {
    // Check admin authentication
    const token = request.cookies.get('admin-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    try {
      const decoded = verifyToken(token)
      if (!decoded || !decoded.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }

      // Check if user is admin
      const admin = await prisma.admin.findUnique({
        where: { userId: decoded.userId }
      })

      if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { electionType, status } = await request.json()

    if (!electionType || !status) {
      return NextResponse.json({ 
        error: 'electionType and status are required' 
      }, { status: 400 })
    }

    if (!['UPCOMING', 'ACTIVE', 'COMPLETED'].includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be UPCOMING, ACTIVE, or COMPLETED' 
      }, { status: 400 })
    }

    const election = await prisma.election.findFirst({
      where: { type: electionType }
    })

    if (!election) {
      return NextResponse.json({ 
        error: `Election with type ${electionType} not found` 
      }, { status: 404 })
    }

    const updatedElection = await prisma.election.update({
      where: { id: election.id },
      data: { status }
    })

    return NextResponse.json({ 
      message: `Election status updated to ${status}`,
      election: updatedElection
    })
  } catch (error) {
    console.error('Error updating election status:', error)
    return NextResponse.json({ 
      error: 'Failed to update election status' 
    }, { status: 500 })
  }
}

