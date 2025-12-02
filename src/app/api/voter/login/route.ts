import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createRateLimitedRoute, rateLimitConfigs } from '@/lib/rate-limit'
import { handleError, ValidationError, AuthenticationError, NotFoundError } from '@/lib/error-handler'
import { logger, logAuth, logRequest } from '@/lib/logger'
import { sessionManager } from '@/lib/session'
import { buildPhoneWhereFilters, normalizePhone } from '@/lib/phone'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(request: NextRequest) {
  try {
    logRequest(request, 'Voter login attempt')
    
    const { phone, otp, location } = await request.json()

    if (!phone || !otp || !location) {
      throw new ValidationError('Phone, OTP, and location are required')
    }

    const normalizedPhone = normalizePhone(phone)

    // Verify OTP - look for recently used OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phone: normalizedPhone,
        code: otp,
        isUsed: true,
        expiresAt: {
          gt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes grace period
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!otpRecord) {
      throw new AuthenticationError('Invalid or expired OTP. Please verify OTP first.')
    }

    const phoneFilters = buildPhoneWhereFilters(phone)

    // Check if voter exists (match different stored formats)
    const voter = await prisma.voter.findFirst({
      where: phoneFilters.length ? { OR: phoneFilters } : { phone }
    })

    console.log('Voter lookup result:', { phone, voter: voter ? { id: voter.id, name: voter.name, voterId: voter.voterId } : null })

    if (!voter) {
      throw new NotFoundError('Voter not found. Please contact administrator.')
    }

    // Update voter's last login
    await prisma.voter.updateMany({
      where: { id: voter.id },
      data: { 
        lastLoginAt: new Date()
      }
    })

    // Create session
    const token = sessionManager.createSession({
      userId: voter.id, // Use voter.id as userId for session
      voterId: voter.voterId,
      phone: voter.phone,
      role: 'VOTER'
    })

    // Log successful authentication
    logAuth(voter.id, 'voter_login', true, { voterId: voter.voterId, phone })

    // Create session response with the token
    const response = NextResponse.json({ 
      message: 'Login successful',
      user: {
        id: voter.id,
        name: voter.name,
        phone: voter.phone,
        voterId: voter.voterId
      }
    })

    // Set the voter token cookie
    response.cookies.set('voter-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    })

    return response

  } catch (error) {
    // Log failed authentication
    if (error instanceof AuthenticationError || error instanceof NotFoundError) {
      logAuth('unknown', 'voter_login', false, { error: (error as Error).message })
    }
    
    return handleError(error, { 
      endpoint: request.nextUrl.pathname,
      method: request.method 
    })
  }
}

export const POST = createRateLimitedRoute(handler, rateLimitConfigs.auth)
