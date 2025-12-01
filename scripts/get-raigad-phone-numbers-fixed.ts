import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function getRaigadPhoneNumbersFixed() {
  console.log('🔍 Getting phone numbers ONLY from Raigad region...\n')
  
  // ONLY get voters where region = "Raigad" (not by zone assignment)
  const voters = await prisma.voter.findMany({
    where: {
      region: 'Raigad',  // Only filter by region, not by zone
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
  
  // Filter voters with phone numbers
  const votersWithPhone = voters.filter(v => v.phone && v.phone.trim() !== '')
  
  console.log(`📊 Total voters with region = "Raigad": ${voters.length}`)
  console.log(`📱 Voters with phone numbers: ${votersWithPhone.length}\n`)
  
  // Show sample to verify
  console.log('📋 Sample voters (first 5):')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  votersWithPhone.slice(0, 5).forEach((v, i) => {
    console.log(`${i + 1}. ${v.voterId} - ${v.name}`)
    console.log(`   Region: ${v.region}`)
    console.log(`   Phone: ${v.phone}`)
    console.log(`   Karobari Zone: ${v.karobariZone?.code || 'None'}`)
    console.log()
  })
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  console.log('📋 All Phone Numbers from Raigad:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  // Extract phone numbers
  const phoneNumbers = votersWithPhone.map(v => v.phone).filter((phone): phone is string => phone !== null && phone !== undefined)
  
  phoneNumbers.forEach((phone, index) => {
    console.log(`${index + 1}. ${phone}`)
  })
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\n✅ Total phone numbers: ${phoneNumbers.length}`)
  
  // Save to files
  const phoneOnlyFile = 'raigad-phone-numbers.txt'
  const detailedFile = 'raigad-phone-numbers-detailed.txt'
  
  // Save phone numbers only
  fs.writeFileSync(phoneOnlyFile, phoneNumbers.join('\n'))
  console.log(`\n💾 Phone numbers saved to: ${phoneOnlyFile}`)
  
  // Save detailed info (voterId, name, phone, region)
  const detailedContent = votersWithPhone
    .map(v => `${v.voterId}\t${v.name}\t${v.phone}\t${v.region}`)
    .join('\n')
  fs.writeFileSync(detailedFile, 'VoterID\tName\tPhone\tRegion\n' + detailedContent)
  console.log(`💾 Detailed info saved to: ${detailedFile}`)
}

getRaigadPhoneNumbersFixed()
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



