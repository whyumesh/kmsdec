import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkVoterYuvaPankZone() {
  console.log('🔍 Checking voters and their Yuva Pankh zone assignments...\n')
  
  // Get a sample of voters
  const voters = await prisma.voter.findMany({
    take: 20,
    select: {
      voterId: true,
      name: true,
      region: true,
      age: true,
      yuvaPankZoneId: true,
      karobariZoneId: true,
      trusteeZoneId: true,
      yuvaPankZone: {
        select: { code: true, name: true }
      },
      karobariZone: {
        select: { code: true, name: true }
      },
      trusteeZone: {
        select: { code: true, name: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  
  console.log('📋 Sample voters and their zone assignments:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  voters.forEach((v, i) => {
    console.log(`\n${i + 1}. ${v.voterId} - ${v.name}`)
    console.log(`   Region: ${v.region}`)
    console.log(`   Age: ${v.age || 'N/A'}`)
    console.log(`   Yuva Pankh Zone: ${v.yuvaPankZone?.code || 'None'} (${v.yuvaPankZone?.name || 'Not assigned'})`)
    console.log(`   Karobari Zone: ${v.karobariZone?.code || 'None'} (${v.karobariZone?.name || 'Not assigned'})`)
    console.log(`   Trustee Zone: ${v.trusteeZone?.code || 'None'} (${v.trusteeZone?.name || 'Not assigned'})`)
  })
  
  // Count voters by zone assignment
  const stats = {
    withYuvaPank: await prisma.voter.count({
      where: { yuvaPankZoneId: { not: null }, isActive: true }
    }),
    withKarobari: await prisma.voter.count({
      where: { karobariZoneId: { not: null }, isActive: true }
    }),
    withTrustee: await prisma.voter.count({
      where: { trusteeZoneId: { not: null }, isActive: true }
    }),
    total: await prisma.voter.count({
      where: { isActive: true }
    })
  }
  
  console.log('\n\n📊 Statistics:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Total active voters: ${stats.total}`)
  console.log(`Voters with Yuva Pankh zone: ${stats.withYuvaPank} (${((stats.withYuvaPank / stats.total) * 100).toFixed(1)}%)`)
  console.log(`Voters with Karobari zone: ${stats.withKarobari} (${((stats.withKarobari / stats.total) * 100).toFixed(1)}%)`)
  console.log(`Voters with Trustee zone: ${stats.withTrustee} (${((stats.withTrustee / stats.total) * 100).toFixed(1)}%)`)
  
  // Check voters who have Karobari/Trustee but not Yuva Pankh
  const missingYuvaPank = await prisma.voter.findMany({
    where: {
      isActive: true,
      karobariZoneId: { not: null },
      yuvaPankZoneId: null
    },
    take: 10,
    select: {
      voterId: true,
      name: true,
      region: true,
      age: true
    }
  })
  
  console.log(`\n\n⚠️  Voters with Karobari/Trustee zones but NO Yuva Pankh zone: ${missingYuvaPank.length} (showing first 10)`)
  missingYuvaPank.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.voterId} - ${v.name} (Region: ${v.region}, Age: ${v.age || 'N/A'})`)
  })
}

checkVoterYuvaPankZone()
  .then(() => {
    console.log('\n✅ Check completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



