import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function countRaigadVoters() {
  console.log('🔍 Counting voters from Raigad zone...\n')
  
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
  
  // Count voters by region
  const votersByRegion = await prisma.voter.count({
    where: {
      region: 'Raigad',
      isActive: true
    }
  })
  
  // Count voters by zone assignments
  const votersByKarobariZone = await prisma.voter.count({
    where: {
      karobariZoneId: { in: raigadZoneIds },
      isActive: true
    }
  })
  
  const votersByTrusteeZone = await prisma.voter.count({
    where: {
      trusteeZoneId: { in: raigadZoneIds },
      isActive: true
    }
  })
  
  const votersByYuvaPankZone = await prisma.voter.count({
    where: {
      yuvaPankZoneId: { in: raigadZoneIds },
      isActive: true
    }
  })
  
  // Total unique voters (by region or any zone)
  const totalVoters = await prisma.voter.count({
    where: {
      OR: [
        { region: 'Raigad' },
        { karobariZoneId: { in: raigadZoneIds } },
        { trusteeZoneId: { in: raigadZoneIds } },
        { yuvaPankZoneId: { in: raigadZoneIds } },
        { zoneId: { in: raigadZoneIds } }
      ],
      isActive: true
    }
  })
  
  console.log('📊 Voter Count Breakdown:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Total Unique Voters from Raigad: ${totalVoters}`)
  console.log()
  console.log('Breakdown:')
  console.log(`  - By Region (Raigad): ${votersByRegion}`)
  console.log(`  - By Karobari Zone: ${votersByKarobariZone}`)
  console.log(`  - By Trustee Zone: ${votersByTrusteeZone}`)
  console.log(`  - By Yuva Pankh Zone: ${votersByYuvaPankZone}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\n✅ SPECIFIC NUMBER: ${totalVoters} voters from Raigad zone`)
}

countRaigadVoters()
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



