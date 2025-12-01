import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, rejectionReason } = await request.json()
    const nominationId = params.id

    if (!status || !['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (status === 'REJECTED' && !rejectionReason?.trim()) {
      return NextResponse.json({ 
        error: 'Rejection reason is required when rejecting a nomination' 
      }, { status: 400 })
    }

    const nomination = await prisma.yuvaPankhCandidate.update({
      where: { id: nominationId },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null
      }
    })

    return NextResponse.json({
      message: 'Nomination status updated successfully',
      nomination: {
        id: nomination.id,
        name: nomination.name,
        status: nomination.status,
        rejectionReason: nomination.rejectionReason
      }
    })

  } catch (error) {
    console.error('Error updating nomination:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
