import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendCandidateRejectionEmail } from '@/lib/mail'

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, rejectionReason } = await request.json()
    const candidateId = params.id

    if (!status || !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (status === 'REJECTED' && !rejectionReason?.trim()) {
      return NextResponse.json({ 
        error: 'Rejection reason is required when rejecting a candidate' 
      }, { status: 400 })
    }

    // Try to find and update the candidate in each table
    let candidate = null;
    let candidateType = '';

    // Try Yuva Pankh Candidate first
    try {
      candidate = await prisma.yuvaPankhCandidate.update({
        where: { id: candidateId },
        data: {
          status,
          rejectionReason: status === 'REJECTED' ? rejectionReason : null
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
      candidateType = 'YUVA_PANKH';
    } catch (error) {
      // Not found in Yuva Pankh, try Karobari
      try {
        candidate = await prisma.karobariCandidate.update({
          where: { id: candidateId },
          data: {
            status,
            rejectionReason: status === 'REJECTED' ? rejectionReason : null
          },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        });
        candidateType = 'KAROBARI';
      } catch (error) {
        // Not found in Karobari, try Trustee
        try {
          candidate = await prisma.trusteeCandidate.update({
            where: { id: candidateId },
            data: {
              status,
              rejectionReason: status === 'REJECTED' ? rejectionReason : null
            },
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          });
          candidateType = 'TRUSTEE';
        } catch (error) {
          return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
        }
      }
    }

    // Send rejection email if candidate is rejected
    if (status === 'REJECTED' && candidate.user?.email && rejectionReason) {
      try {
        const emailResult = await sendCandidateRejectionEmail(
          candidate.user.email,
          candidate.user.name || 'Candidate',
          candidate.position,
          rejectionReason
        )
        
        if (!emailResult.success) {
          console.error('Failed to send rejection email:', emailResult.message)
          // Don't fail the entire request if email fails, just log it
        } else {
          console.log('Rejection email sent successfully to:', candidate.user.email)
        }
      } catch (emailError) {
        console.error('Error sending rejection email:', emailError)
        // Don't fail the entire request if email fails, just log it
      }
    }

    return NextResponse.json({
      message: 'Candidate status updated successfully',
      candidate: {
        id: candidate.id,
        name: candidate.user?.name || 'Unknown',
        status: candidate.status,
        rejectionReason: candidate.rejectionReason,
        candidateType: candidateType
      }
    })

  } catch (error) {
    console.error('Error updating candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
