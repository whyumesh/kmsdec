import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixAbdasaGardaZones() {
  console.log('🔧 Fixing Abdasa & Garda zone assignments...\n')
  
  // Check if ABDASA zone exists
  const abdasaZone = await prisma.zone.findFirst({
    where: {
      code: 'ABDASA',
      electionType: 'KAROBARI_MEMBERS'
    }
  })
  
  if (!abdasaZone) {
    console.log('❌ ABDASA Karobari zone not found in database!')
    console.log('Available Karobari zones:')
    const zones = await prisma.zone.findMany({
      where: { electionType: 'KAROBARI_MEMBERS' },
      select: { code: true, name: true }
    })
    zones.forEach(z => console.log(`   - ${z.code}: ${z.name}`))
    return
  }
  
  console.log(`✅ Found ABDASA zone: ${abdasaZone.name} (${abdasaZone.id})\n`)
  
  // Find all Abdasa & Garda voters without Karobari zone
  const votersToFix = await prisma.voter.findMany({
    where: {
      region: 'Abdasa & Garda',
      karobariZoneId: null,
      age: { gte: 18 }
    },
    select: {
      id: true,
      voterId: true,
      name: true,
      age: true
    }
  })
  
  console.log(`📊 Found ${votersToFix.length} voters to fix\n`)
  
  if (votersToFix.length === 0) {
    console.log('✅ All Abdasa & Garda voters already have Karobari zones!')
    return
  }
  
  // Update voters
  let updated = 0
  for (const voter of votersToFix) {
    try {
      await prisma.voter.update({
        where: { id: voter.id },
        data: {
          karobariZoneId: abdasaZone.id
        }
      })
      updated++
      if (updated % 50 === 0) {
        console.log(`   ✓ Updated ${updated}/${votersToFix.length} voters...`)
      }
    } catch (error: any) {
      console.error(`   ✗ Error updating ${voter.voterId}: ${error.message}`)
    }
  }
  
  console.log(`\n✅ Updated ${updated} voters with ABDASA Karobari zone`)
  
  // Verify
  const finalCount = await prisma.voter.count({
    where: {
      region: 'Abdasa & Garda',
      karobariZoneId: { not: null }
    }
  })
  
  console.log(`\n📊 Final count: ${finalCount} Abdasa & Garda voters with Karobari zone`)
}

fixAbdasaGardaZones()
  .then(() => {
    console.log('\n✅ Fix completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



