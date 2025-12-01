import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateVoters() {
  try {
    console.log('🔍 Validating Voter Data...\n')
    console.log('='.repeat(60))

    // Total voters count
    const totalVoters = await prisma.voter.count()
    console.log(`\n📊 Total Voters in Database: ${totalVoters}`)

    // Voters by zone
    console.log('\n📍 Voters by Zone:')
    console.log('-'.repeat(60))

    const zones = await prisma.zone.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            voters: true,
            yuvaPankVoters: true,
            karobariVoters: true,
            trusteeVoters: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    for (const zone of zones) {
      const totalInZone = zone._count.voters
      const yuvaPank = zone._count.yuvaPankVoters
      const karobari = zone._count.karobariVoters
      const trustee = zone._count.trusteeVoters

      if (totalInZone > 0 || yuvaPank > 0 || karobari > 0 || trustee > 0) {
        console.log(`\n${zone.name} (${zone.code}) - ${zone.electionType}:`)
        console.log(`  Total Voters: ${totalInZone}`)
        if (yuvaPank > 0) console.log(`  Yuva Pankh: ${yuvaPank}`)
        if (karobari > 0) console.log(`  Karobari: ${karobari}`)
        if (trustee > 0) console.log(`  Trustee: ${trustee}`)
      }
    }

    // Voters by region
    console.log('\n\n🌍 Voters by Region:')
    console.log('-'.repeat(60))
    const votersByRegion = await prisma.voter.groupBy({
      by: ['region'],
      _count: true,
      orderBy: { _count: { region: 'desc' } }
    })

    for (const region of votersByRegion) {
      console.log(`  ${region.region}: ${region._count} voters`)
    }

    // Recent uploads (last 24 hours)
    console.log('\n\n⏰ Recent Uploads (Last 24 hours):')
    console.log('-'.repeat(60))
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)
    
    const recentVoters = await prisma.voter.count({
      where: {
        createdAt: {
          gte: yesterday
        }
      }
    })
    console.log(`  ${recentVoters} voters uploaded in the last 24 hours`)

    // Sample voters from each zone
    console.log('\n\n👥 Sample Voters (First 3 from each zone):')
    console.log('-'.repeat(60))

    const sampleZones = await prisma.zone.findMany({
      where: { isActive: true },
      take: 5
    })

    for (const zone of sampleZones) {
      const sampleVoters = await prisma.voter.findMany({
        where: {
          OR: [
            { zoneId: zone.id },
            { yuvaPankZoneId: zone.id },
            { karobariZoneId: zone.id },
            { trusteeZoneId: zone.id }
          ]
        },
        take: 3,
        select: {
          name: true,
          phone: true,
          age: true,
          region: true,
          voterId: true
        }
      })

      if (sampleVoters.length > 0) {
        console.log(`\n${zone.name} (${zone.electionType}):`)
        sampleVoters.forEach(voter => {
          console.log(`  - ${voter.name} (${voter.phone}) - Age: ${voter.age || 'N/A'} - ID: ${voter.voterId}`)
        })
      }
    }

    // Validation checks
    console.log('\n\n✅ Validation Checks:')
    console.log('-'.repeat(60))

    // Check for voters without phone
    const votersWithoutPhone = await prisma.voter.count({
      where: { phone: null }
    })
    console.log(`  Voters without phone: ${votersWithoutPhone} ${votersWithoutPhone === 0 ? '✅' : '⚠️'}`)

    // Check for voters without age
    const votersWithoutAge = await prisma.voter.count({
      where: { age: null }
    })
    console.log(`  Voters without age: ${votersWithoutAge} ${votersWithoutAge === 0 ? '✅' : '⚠️'}`)

    // Check for voters without zones
    const votersWithoutZones = await prisma.voter.count({
      where: {
        zoneId: null,
        yuvaPankZoneId: null,
        karobariZoneId: null,
        trusteeZoneId: null
      }
    })
    console.log(`  Voters without zones: ${votersWithoutZones} ${votersWithoutZones === 0 ? '✅' : '⚠️'}`)

    // Check for duplicate phone numbers (same phone, different names - family members)
    const duplicatePhones = await prisma.voter.groupBy({
      by: ['phone'],
      _count: true,
      having: {
        phone: {
          _count: {
            gt: 1
          }
        }
      }
    })
    console.log(`  Phone numbers with multiple voters (families): ${duplicatePhones.length} ${duplicatePhones.length > 0 ? '✅ (Expected)' : ''}`)

    // Check Yuva Pankh eligibility (age 18-39)
    const yuvaPankhEligible = await prisma.voter.count({
      where: {
        age: {
          gte: 18,
          lte: 39
        },
        yuvaPankZoneId: {
          not: null
        }
      }
    })
    console.log(`  Yuva Pankh eligible voters (18-39): ${yuvaPankhEligible} ✅`)

    // Check Trustee eligibility (age 18+)
    const trusteeEligible = await prisma.voter.count({
      where: {
        age: {
          gte: 18
        },
        trusteeZoneId: {
          not: null
        }
      }
    })
    console.log(`  Trustee eligible voters (18+): ${trusteeEligible} ✅`)

    // Zone-specific counts for uploaded files
    console.log('\n\n📋 Zone-Specific Validation (From Uploaded Files):')
    console.log('-'.repeat(60))

    const zoneChecks = [
      { name: 'Karnataka & Goa', code: 'KARNATAKA_GOA' },
      { name: 'Raigad', code: 'RAIGAD' },
      { name: 'Mumbai', code: 'MUMBAI' },
      { name: 'Bhuj', code: 'BHUJ' }
    ]

    for (const zoneCheck of zoneChecks) {
      const zone = await prisma.zone.findFirst({
        where: { code: zoneCheck.code },
        include: {
          _count: {
            select: {
              voters: true,
              yuvaPankVoters: true,
              karobariVoters: true,
              trusteeVoters: true
            }
          }
        }
      })

      if (zone) {
        console.log(`\n${zoneCheck.name}:`)
        console.log(`  Total: ${zone._count.voters}`)
        console.log(`  Yuva Pankh: ${zone._count.yuvaPankVoters}`)
        console.log(`  Karobari: ${zone._count.karobariVoters}`)
        console.log(`  Trustee: ${zone._count.trusteeVoters}`)
      } else {
        console.log(`\n${zoneCheck.name}: Zone not found ⚠️`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Validation Complete!')
    console.log('='.repeat(60))

  } catch (error: any) {
    console.error('❌ Validation Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

validateVoters()
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

