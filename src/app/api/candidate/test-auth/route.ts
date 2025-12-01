import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JWTError } from '@/lib/jwt'

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('candidate-token')?.value

    console.log('Test Auth API - Token received:', !!token)
    console.log('Test Auth API - All cookies:', request.cookies.getAll())

    if (!token) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 })
    }

    try {
      const decoded = verifyToken(token)
      
      return NextResponse.json({
        authenticated: true,
        user: {
          userId: decoded.userId,
          role: decoded.role,
          email: decoded.email
        }
      })
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

  } catch (error) {
    console.error('Error in test auth:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
