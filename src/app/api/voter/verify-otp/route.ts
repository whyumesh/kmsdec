import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { normalizePhone } from '@/lib/phone'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const { phone, otp } = await request.json()

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone number and OTP are required' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)

    // Find the OTP record
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phone: normalizedPhone,
        code: otp,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true }
    })

    return NextResponse.json({ message: 'OTP verified successfully' })

  } catch (error) {
    console.error('Error verifying OTP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
