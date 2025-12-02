import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateOTP } from '@/lib/utils'
import { sendForgotPasswordOTP } from '@/lib/mail'
import { createRateLimitedRoute, rateLimitConfigs } from '@/lib/rate-limit'
import { logRequest } from '@/lib/logger'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


async function handler(request: NextRequest) {
  try {
    logRequest(request, 'Candidate forgot password OTP request')
    
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if candidate user exists (allow immediately after signup, even without nomination data)
    const user = await prisma.user.findFirst({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'No candidate account found with this email address' 
      }, { status: 404 })
    }

    // Allow password reset for users who signed up through candidate signup
    // or users who have candidate profiles (backward compatibility)
    const hasCandidateProfile = user.role === 'CANDIDATE' || 
                               await prisma.yuvaPankhCandidate.findFirst({ where: { userId: user.id } }) ||
                               await prisma.karobariCandidate.findFirst({ where: { userId: user.id } }) ||
                               await prisma.trusteeCandidate.findFirst({ where: { userId: user.id } })

    if (!hasCandidateProfile) {
      return NextResponse.json({ 
        error: 'No candidate account found with this email address' 
      }, { status: 404 })
    }

    // Generate OTP
    const otpCode = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store OTP in database (using phone field for email-based OTP)
    await prisma.oTP.create({
      data: {
        phone: email, // Using email as identifier for forgot password
        code: otpCode,
        expiresAt
      }
    })

    // Send OTP via email
    const emailResult = await sendForgotPasswordOTP(email, otpCode, user.name)

    if (!emailResult.success) {
      return NextResponse.json({ 
        error: emailResult.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      message: emailResult.message,
      success: true,
      // Remove this in production - only for demo
      otp: process.env.NODE_ENV === 'development' ? otpCode : undefined
    })

  } catch (error) {
    console.error('Error sending forgot password OTP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const POST = createRateLimitedRoute(handler, rateLimitConfigs.otp)
