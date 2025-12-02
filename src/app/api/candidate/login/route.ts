import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { signToken, JWTError } from '@/lib/jwt'
import { createRateLimitedRoute, rateLimitConfigs } from '@/lib/rate-limit'
import { logger, logAuth, logRequest } from '@/lib/logger'
import { handleError } from '@/lib/error-handler'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(request: NextRequest) {
  try {
    logRequest(request, 'Candidate login attempt')
    
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        yuvaPankhCandidates: true,
        karobariCandidates: true,
        trusteeCandidates: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check if user has any candidate profiles (determine role by relations)
    const hasCandidateProfile = user.yuvaPankhCandidates.length > 0 || 
                               user.karobariCandidates.length > 0 || 
                               user.trusteeCandidates.length > 0

    // Allow login even without candidate profiles (user can create nominations after login)
    // The role is determined by the fact they're logging in as a candidate

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password || "")

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check if candidate has nomination (any type of candidate profile)
    const hasNomination = hasCandidateProfile

    // Create JWT token
    const token = signToken({
      userId: user.id, 
      role: 'CANDIDATE',
      email: user.email || ''
    })

    // Log successful authentication
    logAuth(user.id, 'candidate_login', true, { email: user.email })

    // Set cookie
    const response = NextResponse.json({ 
      message: 'Login successful',
      hasNomination: !!hasNomination,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'CANDIDATE'
      }
    })

    response.cookies.set('candidate-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    })

    return response

  } catch (error) {
    // Log failed authentication
    logAuth('unknown', 'candidate_login', false, { error: (error as Error).message })
    
    return handleError(error, { 
      endpoint: request.nextUrl.pathname,
      method: request.method 
    })
  }
}

export const POST = createRateLimitedRoute(handler, rateLimitConfigs.auth)
