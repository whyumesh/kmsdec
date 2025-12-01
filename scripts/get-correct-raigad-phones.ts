import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function getCorrectRaigadPhones() {
  console.log('🔍 Getting phone numbers ONLY from voters with region = "Raigad"...\n')
  
  // STRICTLY filter by region = "Raigad" only
  const voters = await prisma.voter.findMany({
    where: {
      region: 'Raigad',  // Only this filter - no zone checks
      isActive: true
    },
    select: {
      voterId: true,
      name: true,
      phone: true,
      region: true,
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
    orderBy: {
      voterId: 'asc'
    }
  })
  
  console.log(`📊 Total voters with region = "Raigad": ${voters.length}`)
  
  // Filter voters with phone numbers
  const votersWithPhone = voters.filter(v => v.phone && v.phone.trim() !== '')
  
  console.log(`📱 Voters with phone numbers: ${votersWithPhone.length}\n`)
  
  // Show first 10 samples to verify
  console.log('📋 Sample voters (first 10) - VERIFICATION:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  votersWithPhone.slice(0, 10).forEach((v, i) => {
    console.log(`${i + 1}. ${v.voterId} - ${v.name}`)
    console.log(`   Region: ${v.region}`)
    console.log(`   Phone: ${v.phone}`)
    console.log(`   Karobari Zone: ${v.karobariZone?.code || 'None'}`)
    console.log(`   Trustee Zone: ${v.trusteeZone?.code || 'None'}`)
    console.log()
  })
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  // Extract phone numbers
  const phoneNumbers = votersWithPhone.map(v => v.phone).filter((phone): phone is string => phone !== null && phone !== undefined)
  
  console.log(`📋 Total phone numbers: ${phoneNumbers.length}`)
  console.log('\n📱 First 20 phone numbers:')
  phoneNumbers.slice(0, 20).forEach((phone, index) => {
    console.log(`${index + 1}. ${phone}`)
  })
  
  // Save to files
  const phoneOnlyFile = 'raigad-phone-numbers.txt'
  const detailedFile = 'raigad-phone-numbers-detailed.txt'
  
  // Save phone numbers only
  fs.writeFileSync(phoneOnlyFile, phoneNumbers.join('\n'))
  console.log(`\n💾 Phone numbers saved to: ${phoneOnlyFile}`)
  
  // Save detailed info
  const detailedContent = votersWithPhone
    .map(v => `${v.voterId}\t${v.name}\t${v.phone}\t${v.region}\t${v.karobariZone?.code || 'None'}\t${v.trusteeZone?.code || 'None'}\t${v.yuvaPankZone?.code || 'None'}`)
    .join('\n')
  fs.writeFileSync(detailedFile, 'VoterID\tName\tPhone\tRegion\tKarobariZone\tTrusteeZone\tYuvaPankhZone\n' + detailedContent)
  console.log(`💾 Detailed info saved to: ${detailedFile}`)
  
  // Verify a few phone numbers from the saved file
  console.log('\n✅ Verification - Checking first 3 phone numbers from saved file:')
  const firstThreePhones = phoneNumbers.slice(0, 3)
  for (const phone of firstThreePhones) {
    const voter = await prisma.voter.findFirst({
      where: { phone: phone },
      select: { voterId: true, name: true, region: true }
    })
    if (voter) {
      console.log(`  ${phone} -> ${voter.voterId} - ${voter.name} - Region: ${voter.region}`)
    }
  }
}

getCorrectRaigadPhones()
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



