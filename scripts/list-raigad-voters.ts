import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listRaigadVoters() {
  console.log('🔍 Finding voters from Raigad zone...\n')
  
  // Find all zones with code "RAIGAD"
  const raigadZones = await prisma.zone.findMany({
    where: {
      code: 'RAIGAD',
      isActive: true
    },
    select: {
      id: true,
      code: true,
      name: true,
      electionType: true
    }
  })
  
  console.log(`📍 Found ${raigadZones.length} Raigad zone(s):`)
  raigadZones.forEach(zone => {
    console.log(`  - ${zone.code} (${zone.name}) - ${zone.electionType}`)
  })
  console.log()
  
  // Get all zone IDs
  const raigadZoneIds = raigadZones.map(z => z.id)
  
  // Find voters by region or zone assignment
  const voters = await prisma.voter.findMany({
    where: {
      OR: [
        { region: 'Raigad' },
        { karobariZoneId: { in: raigadZoneIds } },
        { trusteeZoneId: { in: raigadZoneIds } },
        { yuvaPankZoneId: { in: raigadZoneIds } },
        { zoneId: { in: raigadZoneIds } }
      ],
      isActive: true
    },
    select: {
      voterId: true,
      name: true,
      region: true,
      karobariZone: {
        select: { code: true, name: true }
      },
      trusteeZone: {
        select: { code: true, name: true }
      },
      yuvaPankZone: {
        select: { code: true, name: true }
      }
    },
    orderBy: {
      voterId: 'asc'
    }
  })
  
  console.log(`📊 Total voters from Raigad: ${voters.length}\n`)
  console.log('📋 Voter Numbers (voterId):')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  // Extract and display voter numbers
  const voterNumbers = voters.map(v => v.voterId)
  voterNumbers.forEach((voterId, index) => {
    console.log(`${index + 1}. ${voterId}`)
  })
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\n✅ Total: ${voterNumbers.length} voters`)
  
  // Also save to a text file
  const fs = require('fs')
  const outputFile = 'raigad-voter-numbers.txt'
  fs.writeFileSync(outputFile, voterNumbers.join('\n'))
  console.log(`\n💾 Voter numbers saved to: ${outputFile}`)
}

listRaigadVoters()
  .then(() => {
    console.log('\n✅ Completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



