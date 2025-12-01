import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixKutchZones() {
  // KUTCH zone doesn't exist for KAROBARI_MEMBERS
  // Assign Kutch voters to ABDASA zone (closest match)
  const abdasaZone = await prisma.zone.findFirst({
    where: {
      code: 'ABDASA',
      electionType: 'KAROBARI_MEMBERS'
    }
  })

  if (!abdasaZone) {
    console.log('❌ ABDASA zone not found for KAROBARI_MEMBERS')
    await prisma.$disconnect()
    return
  }

  console.log(`✅ Found ABDASA zone: ${abdasaZone.id} (${abdasaZone.name})`)

  // Find all voters with region Kutch but missing karobariZoneId
  const kutchVoters = await prisma.voter.findMany({
    where: {
      region: 'Kutch',
      karobariZoneId: null,
      age: { gte: 18 }
    },
    select: { id: true, name: true, phone: true }
  })

  console.log(`\n📊 Found ${kutchVoters.length} Kutch voters missing Karobari zone`)

  if (kutchVoters.length === 0) {
    console.log('✅ No voters to fix')
    await prisma.$disconnect()
    return
  }

  // Update them to ABDASA (since KUTCH doesn't exist for Karobari)
  const result = await prisma.voter.updateMany({
    where: {
      region: 'Kutch',
      karobariZoneId: null,
      age: { gte: 18 }
    },
    data: {
      karobariZoneId: abdasaZone.id
    }
  })

  console.log(`\n✅ Fixed ${result.count} Kutch voters (assigned to ABDASA zone)`)
}

fixKutchZones()
  .then(async () => {
    await prisma.$disconnect()
    console.log('\n✅ Script completed!')
  })
  .catch(async (error) => {
    await prisma.$disconnect()
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

