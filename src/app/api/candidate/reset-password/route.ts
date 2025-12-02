import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { sendPasswordResetConfirmation } from '@/lib/mail'
import { createRateLimitedRoute, rateLimitConfigs } from '@/lib/rate-limit'
import { logRequest, logAuth } from '@/lib/logger'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


async function handler(request: NextRequest) {
  try {
    logRequest(request, 'Candidate password reset attempt')
    
    const { email, otp, newPassword } = await request.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ 
        error: 'Email, OTP, and new password are required' 
      }, { status: 400 })
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 })
    }

    // Find candidate user (permit right after signup without nomination data)
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

    // Verify OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phone: email,
        code: otp,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!otpRecord) {
      return NextResponse.json({ 
        error: 'Invalid or expired OTP. Please request a new one.' 
      }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword
      }
    })

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true }
    })

    // Send confirmation email
    try {
      await sendPasswordResetConfirmation(email, user.name)
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the password reset if email fails
    }

    // Log successful password reset
    logAuth(user.id, 'candidate_password_reset', true, { email: user.email })

    return NextResponse.json({ 
      message: 'Password reset successfully. You can now login with your new password.',
      success: true
    })

  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const POST = createRateLimitedRoute(handler, rateLimitConfigs.otp)
