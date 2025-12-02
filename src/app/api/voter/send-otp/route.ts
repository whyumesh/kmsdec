import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateOTP } from '@/lib/utils'
import { sendOTP } from '@/lib/otp'
import { createRateLimitedRoute, rateLimitConfigs } from '@/lib/rate-limit'
import { logRequest } from '@/lib/logger'
import { buildPhoneWhereFilters, normalizePhone } from '@/lib/phone'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(request: NextRequest) {
  try {
    logRequest(request, 'OTP send attempt')
    
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)
    const phoneFilters = buildPhoneWhereFilters(phone)

    // Check if voter exists in the voter list (match different formats)
    const voter = await prisma.voter.findFirst({
      where: phoneFilters.length ? { OR: phoneFilters } : { phone }
    })

    if (!voter) {
      return NextResponse.json({ error: 'Phone number not found in voter list' }, { status: 404 })
    }

    if (!voter.isActive) {
      return NextResponse.json({ error: 'Your voter registration is inactive' }, { status: 403 })
    }

    // Generate OTP
    const otpCode = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    const canonicalPhone = normalizePhone(voter.phone || phone)

    // Store OTP in database
    await prisma.oTP.create({
      data: {
        phone: canonicalPhone,
        code: otpCode,
        expiresAt
      }
    })

    // Send OTP via SMS service
    const smsTarget = voter.phone || phone
    const smsResult = await sendOTP(smsTarget, otpCode)

    // If SMS sending failed, return error (OTP is still stored in DB for retry scenarios)
    if (!smsResult.success) {
      return NextResponse.json({ 
        error: smsResult.message || 'Failed to send OTP. Please try again.'
      }, { status: 500 })
    }

    // Return success response without exposing OTP
    return NextResponse.json({ 
      message: smsResult.message || 'OTP has been sent to your registered phone number.',
      success: true
    })

  } catch (error) {
    console.error('Error sending OTP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const POST = createRateLimitedRoute(handler, rateLimitConfigs.otp)
