import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
  console.log('🔍 Verifying V2 Upload\n')
  
  // Get total voters
  const totalVoters = await prisma.voter.count()
  console.log(`📊 Total voters: ${totalVoters}\n`)
  
  // Check voters by region
  const votersByRegion = await prisma.voter.groupBy({
    by: ['region'],
    _count: true
  })
  
  console.log('📋 Voters by Region:')
  votersByRegion.forEach(({ region, _count }) => {
    console.log(`   ${region}: ${_count}`)
  })
  
  // Check a sample voter from each zone
  console.log('\n✅ Sample Voters by Zone:\n')
  
  const zones = await prisma.zone.findMany({
    where: { electionType: 'KAROBARI_MEMBERS' },
    include: {
      karobariCandidates: {
        where: { status: 'APPROVED' },
        select: { name: true, id: true }
      }
    }
  })
  
  for (const zone of zones) {
    const voter = await prisma.voter.findFirst({
      where: { karobariZoneId: zone.id },
      select: { name: true, phone: true, region: true }
    })
    
    if (voter) {
      console.log(`📍 Zone: ${zone.code} (${zone.name})`)
      console.log(`   Voter: ${voter.name} (${voter.phone})`)
      console.log(`   Region: ${voter.region}`)
      console.log(`   Candidates in zone: ${zone.karobariCandidates.length}`)
      zone.karobariCandidates.forEach(c => {
        console.log(`     ✓ ${c.name}`)
      })
      console.log()
    }
  }
  
  // Check voters with no phone (should be 0)
  const votersWithNAPhone = await prisma.voter.count({
    where: {
      OR: [
        { phone: null },
        { phone: 'NA' }
      ]
    }
  })
  
  console.log(`\n✅ Voters with NA/null phone: ${votersWithNAPhone} (should be 0)`)
}

verify()
  .then(async () => {
    await prisma.$disconnect()
    console.log('\n✅ Verification complete!')
  })
  .catch(async (error) => {
    await prisma.$disconnect()
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

