import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function POST(request: NextRequest) {
  try {
    const {
      name,
      email,
      phone,
      party,
      position,
      region,
      experience,
      education,
      manifesto,
      electionType = 'yuva-pank'
    } = await request.json()

    // Map election type to election ID
    const electionIdMap: Record<string, string> = {
      'yuva-pank': 'yuva-pank-2024',
      'karobari-members': 'karobari-members-2024',
      'trustees': 'trustees-2024'
    }

    const electionId = electionIdMap[electionType]
    if (!electionId) {
      return NextResponse.json({ 
        error: 'Invalid election type' 
      }, { status: 400 })
    }

    // Validate required fields
    if (!name || !email || !phone || !position || !region || !manifesto) {
      return NextResponse.json({ 
        error: 'All required fields must be filled' 
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
      return NextResponse.json({ 
        error: 'User with this email or phone already exists' 
      }, { status: 400 })
    }

    // Check if candidate already exists for this position and region in any candidate table
    const [yuvaPankhCandidate, karobariCandidate, trusteeCandidate] = await Promise.all([
      prisma.yuvaPankhCandidate.findFirst({
        where: {
          position,
          region,
          status: {
            in: ['PENDING', 'APPROVED']
          }
        }
      }),
      prisma.karobariCandidate.findFirst({
        where: {
          position,
          region,
          status: {
            in: ['PENDING', 'APPROVED']
          }
        }
      }),
      prisma.trusteeCandidate.findFirst({
        where: {
          position,
          region,
          status: {
            in: ['PENDING', 'APPROVED']
          }
        }
      })
    ]);

    const existingCandidate = yuvaPankhCandidate || karobariCandidate || trusteeCandidate;

    if (existingCandidate) {
      return NextResponse.json({ 
        error: 'A candidate for this position in this region already exists' 
      }, { status: 400 })
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        role: 'CANDIDATE' // Set role for backward compatibility
      }
    })

    // Create candidate profile based on election type
    let candidate;
    if (electionId === 'yuva-pank-2024') {
      candidate = await prisma.yuvaPankhCandidate.create({
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          party: party || 'Independent',
          position,
          region,
          experience: experience || '',
          education: education || '',
          manifesto,
          status: 'PENDING',
          isOnlineRegistration: true
        }
      });
    } else if (electionId === 'karobari-members-2024') {
      candidate = await prisma.karobariCandidate.create({
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          party: party || 'Independent',
          position,
          region,
          experience: experience || '',
          education: education || '',
          manifesto,
          status: 'PENDING',
          isOnlineRegistration: true
        }
      });
    } else if (electionId === 'trustees-2024') {
      candidate = await prisma.trusteeCandidate.create({
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          party: party || 'Independent',
          position,
          region,
          experience: experience || '',
          education: education || '',
          manifesto,
          status: 'PENDING',
          isOnlineRegistration: true
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid election type' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Candidate registration successful',
      candidateId: candidate.id
    })

  } catch (error) {
    console.error('Error registering candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
