import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleError } from '@/lib/error-handler'

// Helper function to calculate age from DOB
function calculateAge(dob: string): number {
    const [day, month, year] = dob.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

// Helper function to find appropriate zones for each election type based on region
async function findZonesForRegion(region: string, age: number) {
    const zones: {
        yuvaPankZone: string | null;
        karobariZone: string | null;
        trusteeZone: string | null;
    } = {
        yuvaPankZone: null,
        karobariZone: null,
        trusteeZone: null
    };

    // Map region to zone codes for each election type
    const regionZoneMapping = {
        'Mumbai': {
            yuvaPank: 'MUMBAI',
            karobari: 'MUMBAI',
            trustee: 'MUMBAI'
        },
        'Raigad': {
            yuvaPank: 'RAIGAD',
            karobari: 'RAIGAD',
            trustee: 'RAIGAD'
        },
        'Karnataka & Goa': {
            yuvaPank: 'KARNATAKA_GOA',
            karobari: 'KARNATAKA_GOA',
            trustee: 'KARNATAKA_GOA'
        },
        'Kutch': {
            yuvaPank: 'KUTCH',
            karobari: 'KUTCH',
            trustee: 'KUTCH'
        },
        'Bhuj': {
            yuvaPank: 'BHUJ_ANJAR',
            karobari: 'BHUJ',
            trustee: 'BHUJ'
        },
        'Anjar': {
            yuvaPank: 'BHUJ_ANJAR',
            karobari: 'ANJAR',
            trustee: 'ANJAR_ANYA_GUJARAT'
        },
        'Abdasa': {
            yuvaPank: 'KUTCH',
            karobari: 'ABDASA',
            trustee: 'ABDASA_GARDA'
        },
        'Garda': {
            yuvaPank: 'KUTCH',
            karobari: 'GARADA',
            trustee: 'ABDASA_GARDA'
        },
        'Anya Gujarat': {
            yuvaPank: 'ANYA_GUJARAT',
            karobari: 'ANYA_GUJARAT',
            trustee: 'ANJAR_ANYA_GUJARAT'
        }
    };

    const mapping = (regionZoneMapping as any)[region] || regionZoneMapping['Mumbai']; // Default to Mumbai if region not found

    // Find Yuva Pankh zone (only if age is between 18-40)
    if (age >= 18 && age <= 40) {
        const yuvaPankZone = await prisma.zone.findFirst({
            where: {
                code: mapping.yuvaPank,
                electionType: 'YUVA_PANK'
            }
        });
        zones.yuvaPankZone = yuvaPankZone?.id || null;
    }

    // Find Karobari zone (age 18+)
    if (age >= 18) {
        const karobariZone = await prisma.zone.findFirst({
            where: {
                code: mapping.karobari,
                electionType: 'KAROBARI_MEMBERS'
            }
        });
        zones.karobariZone = karobariZone?.id || null;
    }

    // Find Trustee zone (age 18+)
    if (age >= 18) {
        const trusteeZone = await prisma.zone.findFirst({
            where: {
                code: mapping.trustee,
                electionType: 'TRUSTEES'
            }
        });
        zones.trusteeZone = trusteeZone?.id || null;
    }

    return zones;
}

export async function POST(request: NextRequest) {
  try {
    const { voters } = await request.json()

    if (!voters || !Array.isArray(voters)) {
      return NextResponse.json(
        { error: "Voters array is required" },
        { status: 400 }
      );
    }

    // Validate each voter
    for (const voter of voters) {
      if (!voter.name || !voter.phone || !voter.dob) {
        return NextResponse.json(
          { error: "Name, phone, and date of birth are required for each voter" },
          { status: 400 }
        );
      }

      // Zone assignment is optional - we'll assign a default zone if none provided

      // Calculate age and validate minimum age requirement (18+)
      const age = calculateAge(voter.dob);
      if (age < 18) {
        return NextResponse.json(
          { error: `Voter ${voter.name} must be at least 18 years old. Current age: ${age}` },
          { status: 400 }
        );
      }

      // Validate Yuva Pankh zone eligibility based on age
      if (voter.yuvaPankhZoneId) {
        if (age < 18 || age > 39) {
          return NextResponse.json(
            { error: `Voter ${voter.name} is not eligible for Yuva Pankh zone. Age must be between 18-39 years. Current age: ${age}` },
            { status: 400 }
          );
        }
      }
    }

    // Check for duplicate phone numbers and voter IDs
    const existingPhones = await prisma.user.findMany({
      where: {
        phone: { in: voters.map((v: any) => v.phone) },
      },
      select: { phone: true },
    });

    const existingVoterIds = await prisma.voter.findMany({
      where: {
        voterId: { in: voters.map((v: any) => v.voterId).filter(Boolean) },
      },
      select: { voterId: true },
    });

    if (existingPhones.length > 0) {
      return NextResponse.json(
        {
          error: `Duplicate phone numbers found: ${existingPhones
            .map((v) => v.phone)
            .join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (existingVoterIds.length > 0) {
      return NextResponse.json(
        {
          error: `Duplicate voter IDs found: ${existingVoterIds
            .map((v) => v.voterId)
            .join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Create voters with automatic age calculation and user accounts
    const createdVoters = [];
    const createdUsers = [];
    const createdVoterProfiles = [];

    for (const voter of voters) {
      let calculatedAge = null;
      if (voter.dob) {
        calculatedAge = calculateAge(voter.dob);
      }

      // Get appropriate zones for each election type based on region and age
      const region = voter.region || 'Mumbai'; // Default to Mumbai if no region specified
      const electionZones = await findZonesForRegion(region, calculatedAge || 18);
      
      // Get the primary zone (first available zone) for backward compatibility
      const primaryZoneId = electionZones.yuvaPankZone || electionZones.karobariZone || electionZones.trusteeZone;
      if (!primaryZoneId) {
        return NextResponse.json(
          { error: `No zones available for voter ${voter.name} in region ${region}` },
          { status: 400 }
        );
      }
      
      const primaryZone = await prisma.zone.findUnique({
        where: { id: primaryZoneId }
      });

      // Create User account first
      const user = await prisma.user.create({
        data: {
          phone: voter.phone,
          name: voter.name,
          email: voter.email || `${voter.phone}@voter.kms-election.com`,
          dateOfBirth: voter.dob ? (() => {
            const [day, month, year] = voter.dob.split('/').map(Number);
            return new Date(year, month - 1, day);
          })() : null,
          age: calculatedAge,
          role: 'VOTER',
        },
      });

      // Generate voter ID
      const voterId = voter.voterId || `V${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 2).toUpperCase()}`;

      // Create Voter profile with election-specific zones
      const voterProfile = await prisma.voter.create({
        data: {
          userId: user.id,
          voterId,
          name: voter.name,
          email: voter.email || null,
          phone: voter.phone,
          age: calculatedAge,
          dob: voter.dob || null,
          gender: voter.gender || null,
          mulgam: voter.mulgam || null,
          region: primaryZone?.name || region,
          zoneId: primaryZone?.id, // Keep for backward compatibility
          yuvaPankZoneId: electionZones.yuvaPankZone,
          karobariZoneId: electionZones.karobariZone,
          trusteeZoneId: electionZones.trusteeZone,
          hasVoted: false,
          isActive: true,
        },
      });

      createdVoters.push(voterProfile);
      createdUsers.push(user);
      createdVoterProfiles.push(voterProfile);
    }

    return NextResponse.json({
      message: `${createdVoters.length} voters created successfully with user accounts`,
      count: createdVoters.length,
      details: {
        voters: createdVoters.length,
        userAccounts: createdUsers.length,
        voterProfiles: createdVoterProfiles.length,
      },
    });

  } catch (error) {
    return handleError(error, {
      endpoint: request.nextUrl.pathname,
      method: request.method,
    });
  }
}
