import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyRaigadVoters() {
  console.log('🔍 Verifying Raigad voters...\n')
  
  // Check voters with region = "Raigad"
  const votersByRegion = await prisma.voter.findMany({
    where: {
      region: 'Raigad',
      isActive: true
    },
    select: {
      voterId: true,
      name: true,
      region: true,
      phone: true,
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
    take: 10
  })
  
  console.log('📋 Sample voters with region = "Raigad":')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  votersByRegion.forEach((v, i) => {
    console.log(`${i + 1}. ${v.voterId} - ${v.name}`)
    console.log(`   Region: ${v.region}`)
    console.log(`   Phone: ${v.phone}`)
    console.log(`   Karobari Zone: ${v.karobariZone?.code || 'None'}`)
    console.log(`   Trustee Zone: ${v.trusteeZone?.code || 'None'}`)
    console.log(`   Yuva Pankh Zone: ${v.yuvaPankZone?.code || 'None'}`)
    console.log()
  })
  
  // Check all unique regions in database
  const allRegions = await prisma.voter.findMany({
    select: {
      region: true
    },
    distinct: ['region']
  })
  
  console.log('\n📊 All regions in database:')
  allRegions.forEach(r => {
    console.log(`  - ${r.region}`)
  })
  
  // Count voters by region
  const regionCounts = await prisma.voter.groupBy({
    by: ['region'],
    where: {
      isActive: true
    },
    _count: {
      id: true
    }
  })
  
  console.log('\n📊 Voter counts by region:')
  regionCounts.forEach(rc => {
    console.log(`  ${rc.region}: ${rc._count.id} voters`)
  })
  
  // Check what zones exist
  const allZones = await prisma.zone.findMany({
    where: {
      isActive: true
    },
    select: {
      code: true,
      name: true,
      electionType: true
    }
  })
  
  console.log('\n🗺️  All zones in database:')
  allZones.forEach(z => {
    console.log(`  ${z.code} (${z.name}) - ${z.electionType}`)
  })
}

verifyRaigadVoters()
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



