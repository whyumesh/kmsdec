import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { signToken, JWTError } from '@/lib/jwt'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password } = await request.json()

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return NextResponse.json({ 
        error: 'All fields are required' 
      }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    })

    if (existingUser) {
      // If user exists but has no password, it means they used auto-save
      // We should update their record with the password instead of creating a new one
      if (!existingUser.password) {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12)
        
        // Update existing user with password and name
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            password: hashedPassword,
            role: 'CANDIDATE'
          }
        })

        // Create JWT token with CANDIDATE role
        const token = signToken({
          userId: updatedUser.id, 
          role: 'CANDIDATE',
          email: updatedUser.email || ''
        })

        // Set cookie
        const response = NextResponse.json({ 
          message: 'Candidate account created successfully',
          userId: updatedUser.id
        })

        response.cookies.set('candidate-token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 // 24 hours
        })

        return response
      } else {
        // User exists with password, so it's a duplicate
        return NextResponse.json({ 
          error: 'User with this email or phone already exists' 
        }, { status: 400 })
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user with hashed password
    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        password: hashedPassword,
        role: 'CANDIDATE',
      }
    })

    // Create JWT token with CANDIDATE role
    const token = signToken({
      userId: user.id, 
      role: 'CANDIDATE',
      email: user.email || ''
    })

    // Set cookie
    const response = NextResponse.json({ 
      message: 'Candidate account created successfully',
      userId: user.id
    })

    response.cookies.set('candidate-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    })

    return response

  } catch (error) {
    console.error('Error creating candidate account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
