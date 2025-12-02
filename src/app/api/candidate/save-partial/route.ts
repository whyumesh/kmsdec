import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('candidate-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let decoded;
    try {
      decoded = verifyToken(token)
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { mobileNumber, emailId } = await request.json()

    // Validate required fields
    if (!mobileNumber || !emailId) {
      return NextResponse.json({ 
        error: 'Mobile number and email are required' 
      }, { status: 400 })
    }

    // Validate mobile number format (10 digits)
    if (!/^\d{10}$/.test(mobileNumber)) {
      return NextResponse.json({ 
        error: 'Mobile number must be exactly 10 digits' 
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailId)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 })
    }

    // Check if another user already has this mobile or email
    const existingUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: decoded.userId } }, // Exclude current user
          {
            OR: [
              { phone: mobileNumber },
              { email: emailId }
            ]
          }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json({ 
        error: 'Mobile number or email already exists for another user' 
      }, { status: 400 })
    }

    // Update user with mobile and email
    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        phone: mobileNumber,
        email: emailId
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    })

    return NextResponse.json({ 
      message: 'Mobile number and email saved successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error saving partial candidate data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
