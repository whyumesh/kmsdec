import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyByVoterId() {
  console.log('🔍 Verifying by Voter ID (not phone number)...\n')
  
  // Get voters with region = "Raigad"
  const raigadVoters = await prisma.voter.findMany({
    where: {
      region: 'Raigad',
      isActive: true
    },
    select: {
      voterId: true,
      name: true,
      phone: true,
      region: true
    },
    take: 10
  })
  
  console.log('📋 First 10 voters with region = "Raigad":')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  raigadVoters.forEach((v, i) => {
    console.log(`${i + 1}. ${v.voterId} - ${v.name}`)
    console.log(`   Phone: ${v.phone}`)
    console.log(`   Region: ${v.region}`)
    
    // Now verify by voter ID
    const verify = prisma.voter.findUnique({
      where: { voterId: v.voterId },
      select: { region: true, phone: true }
    })
    console.log()
  })
  
  // Check for duplicate phone numbers
  console.log('\n⚠️  Checking for duplicate phone numbers...')
  const allVoters = await prisma.voter.findMany({
    where: {
      isActive: true,
      phone: { not: null }
    },
    select: {
      voterId: true,
      phone: true,
      region: true
    }
  })
  
  const phoneMap = new Map<string, Array<{voterId: string, region: string}>>()
  allVoters.forEach(v => {
    if (v.phone) {
      if (!phoneMap.has(v.phone)) {
        phoneMap.set(v.phone, [])
      }
      phoneMap.get(v.phone)!.push({ voterId: v.voterId, region: v.region })
    }
  })
  
  const duplicates = Array.from(phoneMap.entries()).filter(([phone, voters]) => voters.length > 1)
  console.log(`Found ${duplicates.length} phone numbers that appear in multiple voters`)
  
  // Show first 10 duplicates
  console.log('\n📋 Sample duplicate phone numbers:')
  duplicates.slice(0, 10).forEach(([phone, voters]) => {
    console.log(`\nPhone: ${phone} (appears ${voters.length} times)`)
    voters.forEach(v => {
      console.log(`  - ${v.voterId} (${v.region})`)
    })
  })
  
  // Count how many Raigad voters have phone numbers that also appear in Mumbai
  const raigadPhones = raigadVoters.map(v => v.phone).filter(Boolean)
  let raigadMumbaiOverlap = 0
  raigadPhones.forEach(phone => {
    const votersWithPhone = phoneMap.get(phone!) || []
    const hasMumbai = votersWithPhone.some(v => v.region === 'Mumbai')
    const hasRaigad = votersWithPhone.some(v => v.region === 'Raigad')
    if (hasMumbai && hasRaigad) {
      raigadMumbaiOverlap++
    }
  })
  
  console.log(`\n⚠️  ${raigadMumbaiOverlap} out of ${raigadPhones.length} Raigad phone numbers also appear in Mumbai voters`)
}

verifyByVoterId()
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



