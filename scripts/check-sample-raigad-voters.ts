import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSampleRaigadVoters() {
  console.log('🔍 Checking sample voters from the phone list...\n')
  
  // Get a few phone numbers from the list
  const samplePhones = [
    '7020940852',
    '9850827088',
    '9049817603',
    '9011963981'
  ]
  
  console.log('📋 Checking voters with these phone numbers:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  for (const phone of samplePhones) {
    const voter = await prisma.voter.findFirst({
      where: {
        phone: phone
      },
      include: {
        karobariZone: {
          select: { code: true, name: true, electionType: true }
        },
        trusteeZone: {
          select: { code: true, name: true, electionType: true }
        },
        yuvaPankZone: {
          select: { code: true, name: true, electionType: true }
        }
      }
    })
    
    if (voter) {
      console.log(`\nPhone: ${phone}`)
      console.log(`  Voter ID: ${voter.voterId}`)
      console.log(`  Name: ${voter.name}`)
      console.log(`  Region: ${voter.region}`)
      console.log(`  Karobari Zone: ${voter.karobariZone?.code || 'None'} (${voter.karobariZone?.electionType || 'N/A'})`)
      console.log(`  Trustee Zone: ${voter.trusteeZone?.code || 'None'} (${voter.trusteeZone?.electionType || 'N/A'})`)
      console.log(`  Yuva Pankh Zone: ${voter.yuvaPankZone?.code || 'None'} (${voter.yuvaPankZone?.electionType || 'N/A'})`)
    } else {
      console.log(`\nPhone: ${phone} - NOT FOUND`)
    }
  }
  
  // Also check if there are any voters with region = "Raigad" but zones from Mumbai
  console.log('\n\n⚠️  Checking for mismatches (Raigad region but Mumbai zones):')
  const mismatches = await prisma.voter.findMany({
    where: {
      region: 'Raigad',
      isActive: true,
      OR: [
        { karobariZone: { code: 'MUMBAI' } },
        { trusteeZone: { code: 'MUMBAI' } },
        { yuvaPankZone: { code: 'MUMBAI' } }
      ]
    },
    select: {
      voterId: true,
      name: true,
      region: true,
      phone: true,
      karobariZone: { select: { code: true } },
      trusteeZone: { select: { code: true } },
      yuvaPankZone: { select: { code: true } }
    },
    take: 10
  })
  
  console.log(`Found ${mismatches.length} voters with region=Raigad but Mumbai zones`)
  if (mismatches.length > 0) {
    mismatches.forEach(v => {
      console.log(`  ${v.voterId} - ${v.name} - Phone: ${v.phone}`)
      console.log(`    Karobari: ${v.karobariZone?.code || 'None'}, Trustee: ${v.trusteeZone?.code || 'None'}, Yuva Pankh: ${v.yuvaPankZone?.code || 'None'}`)
    })
  }
  
  // Check reverse - Mumbai region but Raigad zones
  console.log('\n\n⚠️  Checking for reverse mismatches (Mumbai region but Raigad zones):')
  const reverseMismatches = await prisma.voter.findMany({
    where: {
      region: 'Mumbai',
      isActive: true,
      OR: [
        { karobariZone: { code: 'RAIGAD' } },
        { trusteeZone: { code: 'RAIGAD' } },
        { yuvaPankZone: { code: 'RAIGAD' } }
      ]
    },
    select: {
      voterId: true,
      name: true,
      region: true,
      phone: true,
      karobariZone: { select: { code: true } },
      trusteeZone: { select: { code: true } },
      yuvaPankZone: { select: { code: true } }
    },
    take: 10
  })
  
  console.log(`Found ${reverseMismatches.length} voters with region=Mumbai but Raigad zones`)
  if (reverseMismatches.length > 0) {
    reverseMismatches.forEach(v => {
      console.log(`  ${v.voterId} - ${v.name} - Phone: ${v.phone}`)
      console.log(`    Karobari: ${v.karobariZone?.code || 'None'}, Trustee: ${v.trusteeZone?.code || 'None'}, Yuva Pankh: ${v.yuvaPankZone?.code || 'None'}`)
    })
  }
}

checkSampleRaigadVoters()
  .then(() => {
    console.log('\n✅ Verification completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



