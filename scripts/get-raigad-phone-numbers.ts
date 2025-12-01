import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function getRaigadPhoneNumbers() {
  console.log('🔍 Getting phone numbers from Raigad zone...\n')
  
  // Find all zones with code "RAIGAD"
  const raigadZones = await prisma.zone.findMany({
    where: {
      code: 'RAIGAD',
      isActive: true
    },
    select: {
      id: true,
      code: true,
      name: true,
      electionType: true
    }
  })
  
  const raigadZoneIds = raigadZones.map(z => z.id)
  
  // Get all voters from Raigad with phone numbers
  const voters = await prisma.voter.findMany({
    where: {
      OR: [
        { region: 'Raigad' },
        { karobariZoneId: { in: raigadZoneIds } },
        { trusteeZoneId: { in: raigadZoneIds } },
        { yuvaPankZoneId: { in: raigadZoneIds } },
        { zoneId: { in: raigadZoneIds } }
      ],
      isActive: true
    },
    select: {
      voterId: true,
      name: true,
      phone: true,
      region: true
    },
    orderBy: {
      voterId: 'asc'
    }
  })
  
  // Filter voters with phone numbers
  const votersWithPhone = voters.filter(v => v.phone && v.phone.trim() !== '')
  
  console.log(`📊 Total voters from Raigad: ${voters.length}`)
  console.log(`📱 Voters with phone numbers: ${votersWithPhone.length}\n`)
  
  console.log('📋 Phone Numbers from Raigad:')
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
  
  // Save detailed info (voterId, name, phone)
  const detailedContent = votersWithPhone
    .map(v => `${v.voterId}\t${v.name}\t${v.phone}`)
    .join('\n')
  fs.writeFileSync(detailedFile, 'VoterID\tName\tPhone\n' + detailedContent)
  console.log(`💾 Detailed info saved to: ${detailedFile}`)
}

getRaigadPhoneNumbers()
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



