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
    
    console.log('=== Send OTP Handler Started ===')
    console.log('Request method:', request.method)
    console.log('Request URL:', request.url)
    
    let requestBody
    try {
      requestBody = await request.json()
      console.log('Request body parsed:', { phone: requestBody.phone ? '***' : 'missing' })
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    
    const { phone } = requestBody

    console.log('Send OTP request received:', { phone: phone ? '***' : 'missing' })

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)
    console.log('Normalized phone:', normalizedPhone)
    const phoneFilters = buildPhoneWhereFilters(phone)
    console.log('Phone filters:', phoneFilters.length)

    // Check if voter exists in the voter list (match different formats)
    const voter = await prisma.voter.findFirst({
      where: phoneFilters.length ? { OR: phoneFilters } : { phone }
    })

    console.log('Voter lookup result:', { 
      found: !!voter, 
      voterId: voter?.voterId,
      isActive: voter?.isActive 
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
    const successResponse = NextResponse.json({ 
      message: smsResult.message || 'OTP has been sent to your registered phone number.',
      success: true
    })
    
    console.log('=== Send OTP Handler Success ===')
    console.log('Response status:', 200)
    return successResponse

  } catch (error) {
    console.error('=== Send OTP Handler Error ===')
    console.error('Error sending OTP:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', { 
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    })
    
    const errorResponse = NextResponse.json({ 
      error: error instanceof Error ? `Internal server error: ${errorMessage}` : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 })
    
    console.log('=== Send OTP Handler Error Response ===')
    return errorResponse
  }
}

export const POST = createRateLimitedRoute(handler, rateLimitConfigs.otp)
