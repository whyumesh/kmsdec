import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyZoneAssignmentIssues() {
  console.log('🔍 Verifying Zone Assignment Issues...\n')
  
  // Check voters without Karobari zone but with age >= 18
  const missingKarobari = await prisma.voter.findMany({
    where: {
      karobariZoneId: null,
      age: { gte: 18 }
    },
    take: 20,
    select: {
      voterId: true,
      name: true,
      region: true,
      age: true,
      karobariZoneId: true,
      trusteeZoneId: true
    }
  })
  
  console.log(`⚠️  Found ${missingKarobari.length} voters (age >= 18) WITHOUT Karobari zone (showing first 20):`)
  missingKarobari.forEach((v, i) => {
    console.log(`   ${i + 1}. ${v.voterId} - ${v.name} (${v.region}, Age: ${v.age})`)
  })
  
  // Check voters without Trustee zone but with age >= 18
  const missingTrustee = await prisma.voter.findMany({
    where: {
      trusteeZoneId: null,
      age: { gte: 18 }
    },
    take: 20,
    select: {
      voterId: true,
      name: true,
      region: true,
      age: true
    }
  })
  
  if (missingTrustee.length > 0) {
    console.log(`\n⚠️  Found ${missingTrustee.length} voters (age >= 18) WITHOUT Trustee zone (showing first 20):`)
    missingTrustee.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.voterId} - ${v.name} (${v.region}, Age: ${v.age})`)
    })
  } else {
    console.log('\n✅ All voters age 18+ have Trustee zones assigned')
  }
  
  // Check region mapping
  console.log('\n📊 Checking region to zone mapping:')
  const regions = await prisma.voter.groupBy({
    by: ['region'],
    _count: { id: true }
  })
  
  for (const regionGroup of regions) {
    const region = regionGroup.region
    const total = regionGroup._count.id
    const withKarobari = await prisma.voter.count({
      where: {
        region,
        karobariZoneId: { not: null }
      }
    })
    const withTrustee = await prisma.voter.count({
      where: {
        region,
        trusteeZoneId: { not: null }
      }
    })
    const withYuvaPank = await prisma.voter.count({
      where: {
        region,
        yuvaPankZoneId: { not: null }
      }
    })
    
    console.log(`\n${region}:`)
    console.log(`   Total: ${total}`)
    console.log(`   With Karobari zone: ${withKarobari} (${((withKarobari/total)*100).toFixed(1)}%)`)
    console.log(`   With Trustee zone: ${withTrustee} (${((withTrustee/total)*100).toFixed(1)}%)`)
    console.log(`   With Yuva Pankh zone: ${withYuvaPank} (${((withYuvaPank/total)*100).toFixed(1)}%)`)
    
    // Check age distribution for this region
    const age18plus = await prisma.voter.count({
      where: {
        region,
        age: { gte: 18 }
      }
    })
    const age18to39 = await prisma.voter.count({
      where: {
        region,
        age: { gte: 18, lte: 39 }
      }
    })
    console.log(`   Age 18+: ${age18plus}`)
    console.log(`   Age 18-39: ${age18to39}`)
  }
}

verifyZoneAssignmentIssues()
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



