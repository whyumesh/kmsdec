import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkVoterCounts() {
  console.log('🔍 Checking voter counts in database...\n')
  
  // Total voters
  const totalVoters = await prisma.voter.count()
  console.log(`📊 Total voters in database: ${totalVoters}`)
  
  // Active voters
  const activeVoters = await prisma.voter.count({
    where: { isActive: true }
  })
  console.log(`✅ Active voters: ${activeVoters}`)
  
  // Inactive voters
  const inactiveVoters = await prisma.voter.count({
    where: { isActive: false }
  })
  console.log(`❌ Inactive voters: ${inactiveVoters}`)
  
  // Voters with phone numbers
  const votersWithPhone = await prisma.voter.count({
    where: {
      phone: { not: null }
    }
  })
  console.log(`📞 Voters with phone: ${votersWithPhone}`)
  
  // Voters with placeholder phones (starting with 9999)
  const votersWithPlaceholderPhone = await prisma.voter.count({
    where: {
      phone: { startsWith: '9999' }
    }
  })
  console.log(`🔢 Voters with placeholder phone (9999*): ${votersWithPlaceholderPhone}`)
  
  // Voters without phone
  const votersWithoutPhone = await prisma.voter.count({
    where: {
      phone: null
    }
  })
  console.log(`🚫 Voters without phone: ${votersWithoutPhone}`)
  
  // Count by region
  console.log('\n📊 Voters by region:')
  const votersByRegion = await prisma.voter.groupBy({
    by: ['region'],
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    }
  })
  
  votersByRegion.forEach((group) => {
    console.log(`   ${group.region || 'Unknown'}: ${group._count.id}`)
  })
  
  // Count by zone assignment
  console.log('\n📊 Zone assignments:')
  const withYuvaPankZone = await prisma.voter.count({
    where: { yuvaPankZoneId: { not: null } }
  })
  const withKarobariZone = await prisma.voter.count({
    where: { karobariZoneId: { not: null } }
  })
  const withTrusteeZone = await prisma.voter.count({
    where: { trusteeZoneId: { not: null } }
  })
  
  console.log(`   Yuva Pankh zone: ${withYuvaPankZone}`)
  console.log(`   Karobari zone: ${withKarobariZone}`)
  console.log(`   Trustee zone: ${withTrusteeZone}`)
  
  // Check for duplicate voterIds
  console.log('\n🔍 Checking for duplicate voterIds...')
  const duplicateVoterIds = await prisma.$queryRaw<Array<{ voterId: string; count: bigint }>>`
    SELECT "voterId", COUNT(*) as count
    FROM voters
    GROUP BY "voterId"
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 10
  `
  
  if (duplicateVoterIds.length > 0) {
    console.log(`⚠️  Found ${duplicateVoterIds.length} duplicate voterIds:`)
    duplicateVoterIds.forEach((dup) => {
      console.log(`   ${dup.voterId}: ${dup.count} entries`)
    })
  } else {
    console.log('✅ No duplicate voterIds found')
  }
  
  // Sample voters to see creation dates
  console.log('\n📅 Sample of recent voters (last 10):')
  const recentVoters = await prisma.voter.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      voterId: true,
      name: true,
      region: true,
      phone: true,
      createdAt: true
    }
  })
  
  recentVoters.forEach((v, i) => {
    console.log(`   ${i + 1}. ${v.voterId} - ${v.name} (${v.region}) - Created: ${v.createdAt.toISOString().split('T')[0]}`)
  })
}

checkVoterCounts()
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



