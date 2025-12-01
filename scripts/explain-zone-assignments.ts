import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function explainZoneAssignments() {
  console.log('📊 Explaining Zone Assignments...\n')
  
  // Total voters
  const totalVoters = await prisma.voter.count()
  console.log(`Total voters in database: ${totalVoters}\n`)
  
  // Breakdown by zone assignments
  const withYuvaPankZone = await prisma.voter.count({
    where: { yuvaPankZoneId: { not: null } }
  })
  const withKarobariZone = await prisma.voter.count({
    where: { karobariZoneId: { not: null } }
  })
  const withTrusteeZone = await prisma.voter.count({
    where: { trusteeZoneId: { not: null } }
  })
  
  console.log('📍 Zone Assignment Breakdown:')
  console.log(`   Yuva Pankh zone: ${withYuvaPankZone} voters`)
  console.log(`   Karobari zone: ${withKarobariZone} voters`)
  console.log(`   Trustee zone: ${withTrusteeZone} voters\n`)
  
  // Explain why numbers are different
  console.log('📝 Explanation:\n')
  
  console.log('1. TRUSTEE ZONE (3,369 voters):')
  console.log('   ✅ ALL voters age 18+ get a Trustee zone')
  console.log('   ✅ Eligibility: Age >= 18 years')
  console.log('   ✅ All regions are eligible')
  console.log(`   ✅ Result: ${withTrusteeZone}/${totalVoters} voters (100%)\n`)
  
  console.log('2. KAROBARI ZONE (2,948 voters):')
  console.log('   ✅ Voters age 18+ get a Karobari zone')
  console.log('   ✅ Eligibility: Age >= 18 years')
  console.log('   ✅ All regions are eligible')
  console.log(`   ⚠️  Missing: ${totalVoters - withKarobariZone} voters (likely under 18 or missing age data)\n`)
  
  console.log('3. YUVA PANKH ZONE (346 voters):')
  console.log('   ✅ Voters age 18-39 get a Yuva Pankh zone')
  console.log('   ✅ BUT only from specific regions:')
  console.log('      - Karnataka & Goa')
  console.log('      - Raigad')
  console.log('   ❌ Other regions (Mumbai, Bhuj, Anjar, etc.) are NOT eligible')
  console.log(`   ⚠️  Missing: ${totalVoters - withYuvaPankZone} voters (age > 39 or wrong region)\n`)
  
  // Detailed breakdown
  console.log('📊 Detailed Breakdown by Region and Age:\n')
  
  // Voters with Yuva Pankh zone by region
  const yuvaPankByRegion = await prisma.voter.groupBy({
    by: ['region'],
    where: { yuvaPankZoneId: { not: null } },
    _count: { id: true }
  })
  
  console.log('Yuva Pankh Zone Assignments by Region:')
  yuvaPankByRegion.forEach((group) => {
    console.log(`   ${group.region}: ${group._count.id} voters`)
  })
  
  // Check voters without Yuva Pankh zone
  const withoutYuvaPank = await prisma.voter.findMany({
    where: { yuvaPankZoneId: null },
    select: {
      voterId: true,
      name: true,
      region: true,
      age: true
    },
    take: 10
  })
  
  console.log(`\n📋 Sample voters WITHOUT Yuva Pankh zone (showing first 10):`)
  withoutYuvaPank.forEach((v, i) => {
    const reason = v.age && v.age >= 18 && v.age <= 39 
      ? 'Wrong region' 
      : v.age && v.age > 39 
      ? 'Age > 39' 
      : v.age && v.age < 18
      ? 'Age < 18'
      : 'Age missing'
    console.log(`   ${i + 1}. ${v.voterId} - ${v.name} (${v.region}, Age: ${v.age || 'N/A'}) - Reason: ${reason}`)
  })
  
  // Check voters without Karobari zone
  const withoutKarobari = await prisma.voter.findMany({
    where: { karobariZoneId: null },
    select: {
      voterId: true,
      name: true,
      region: true,
      age: true
    },
    take: 10
  })
  
  console.log(`\n📋 Sample voters WITHOUT Karobari zone (showing first 10):`)
  withoutKarobari.forEach((v, i) => {
    const reason = v.age && v.age < 18 
      ? 'Age < 18' 
      : 'Age missing'
    console.log(`   ${i + 1}. ${v.voterId} - ${v.name} (${v.region}, Age: ${v.age || 'N/A'}) - Reason: ${reason}`)
  })
  
  // Age distribution
  console.log('\n📊 Age Distribution:')
  const ageGroups = {
    under18: await prisma.voter.count({ where: { age: { lt: 18 } } }),
    age18to39: await prisma.voter.count({ where: { age: { gte: 18, lte: 39 } } }),
    age40plus: await prisma.voter.count({ where: { age: { gt: 39 } } }),
    noAge: await prisma.voter.count({ where: { age: null } })
  }
  
  console.log(`   Under 18: ${ageGroups.under18}`)
  console.log(`   Age 18-39: ${ageGroups.age18to39}`)
  console.log(`   Age 40+: ${ageGroups.age40plus}`)
  console.log(`   Age missing: ${ageGroups.noAge}`)
  
  // Region eligibility for Yuva Pankh
  console.log('\n📊 Region Eligibility for Yuva Pankh:')
  const eligibleRegions = ['Karnataka & Goa', 'Raigad']
  const ineligibleRegions = await prisma.voter.groupBy({
    by: ['region'],
    where: {
      region: { notIn: eligibleRegions },
      age: { gte: 18, lte: 39 }
    },
    _count: { id: true }
  })
  
  console.log('   Eligible regions (Karnataka & Goa, Raigad):')
  eligibleRegions.forEach(region => {
    prisma.voter.count({
      where: { 
        region,
        age: { gte: 18, lte: 39 }
      }
    }).then(count => {
      console.log(`     ${region}: ${count} voters (age 18-39)`)
    })
  })
  
  console.log('\n   Ineligible regions (but age 18-39):')
  ineligibleRegions.forEach((group) => {
    console.log(`     ${group.region}: ${group._count.id} voters (age 18-39 but wrong region)`)
  })
}

explainZoneAssignments()
  .then(() => {
    console.log('\n✅ Explanation completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



