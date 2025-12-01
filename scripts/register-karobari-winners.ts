import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Elected Karobari Samiti Members 2026-2029 (from the announcement)
const ELECTED_CANDIDATES = [
  // Garada-Lakhpat & Nakhatrana (2/2) - Zone: GARADA
  { name: 'Deepak Ladharam Sharda', zoneCode: 'GARADA', region: 'Kutch' },
  { name: 'Kishor Mangaldas Somani', zoneCode: 'GARADA', region: 'Kutch' },
  
  // Abdasa (1/1) - Zone: ABDASA
  { name: 'Jayesh Jagdishbhai Ladhad', zoneCode: 'ABDASA', region: 'Kutch' },
  
  // Bhuj (3/3) - Zone: BHUJ
  { name: 'Pankaj Shamji Bhedakiya', zoneCode: 'BHUJ', region: 'Bhuj' },
  { name: 'Hitesh Mangaldas Bhutada', zoneCode: 'BHUJ', region: 'Bhuj' }, // Pappubhai is nickname
  { name: 'Jayantilal Chandrakant Mandan', zoneCode: 'BHUJ', region: 'Bhuj' },
  
  // Anjar (1/1) - Zone: ANJAR
  { name: 'Gautam Damodarbhai Gagdani', zoneCode: 'ANJAR', region: 'Anjar' },
  
  // Anya Gujarat (3/3) - Zone: ANYA_GUJARAT
  { name: 'Mitaben Anil Bhutada', zoneCode: 'ANYA_GUJARAT', region: 'Anya Gujarat' },
  { name: 'Manilal Damodar Mall', zoneCode: 'ANYA_GUJARAT', region: 'Anya Gujarat' },
  { name: 'Bhavesh Mohanbhai Bhutada', zoneCode: 'ANYA_GUJARAT', region: 'Anya Gujarat' },
  
  // Mumbai (6/6) - Zone: MUMBAI
  { name: 'Nandu Bhanji Gingal', zoneCode: 'MUMBAI', region: 'Mumbai' },
  { name: 'Deepak Kishor Karwa', zoneCode: 'MUMBAI', region: 'Mumbai' },
  { name: 'Jaymin Ramji Mall', zoneCode: 'MUMBAI', region: 'Mumbai' },
  { name: 'Kiran Jamnadas Rathi', zoneCode: 'MUMBAI', region: 'Mumbai' },
  { name: 'Raghuvir Kiritbhai Zaveri', zoneCode: 'MUMBAI', region: 'Mumbai' },
  { name: 'Girish Jethalal Rathi', zoneCode: 'MUMBAI', region: 'Mumbai' },
  
  // Raigad (4/4) - Zone: RAIGAD
  { name: 'Latesh Bharat Mandan', zoneCode: 'RAIGAD', region: 'Raigad' },
  { name: 'Paresh Keshavji Karwa', zoneCode: 'RAIGAD', region: 'Raigad' },
  { name: 'Anjana Ashwin Bhutada', zoneCode: 'RAIGAD', region: 'Raigad' },
  { name: 'Alpeshkumar Harilal Bhutada', zoneCode: 'RAIGAD', region: 'Raigad' },
  
  // Karnataka & Goa (1/1) - Zone: KARNATAKA_GOA
  { name: 'Rajnikant Hirachand Ladhad', zoneCode: 'KARNATAKA_GOA', region: 'Karnataka & Goa' }
]

async function registerWinners() {
  console.log('📋 Registering Karobari Election Winners 2026-2029\n')
  console.log('=' .repeat(80))
  
  // Get all Karobari zones
  const zones = await prisma.zone.findMany({
    where: {
      electionType: 'KAROBARI_MEMBERS',
      isActive: true
    },
    select: {
      id: true,
      code: true,
      name: true
    }
  })
  
  const zoneMap = new Map(zones.map(z => [z.code, z]))
  
  let created = 0
  let updated = 0
  let errors = 0
  
  for (const candidate of ELECTED_CANDIDATES) {
    const zone = zoneMap.get(candidate.zoneCode)
    
    if (!zone) {
      console.log(`❌ Zone not found: ${candidate.zoneCode} for ${candidate.name}`)
      errors++
      continue
    }
    
    try {
      // Check if candidate already exists (by name and zone)
      const existing = await prisma.karobariCandidate.findFirst({
        where: {
          name: { contains: candidate.name.split(' ')[0], mode: 'insensitive' },
          zoneId: zone.id
        }
      })
      
      if (existing) {
        // Update existing candidate
        await prisma.karobariCandidate.update({
          where: { id: existing.id },
          data: {
            name: candidate.name,
            region: candidate.region,
            zoneId: zone.id,
            status: 'APPROVED', // Mark as approved/elected
            position: 'KAROBARI_MEMBER' // Default position
          }
        })
        updated++
        console.log(`✅ Updated: ${candidate.name} (Zone: ${candidate.zoneCode})`)
      } else {
        // Create new candidate
        await prisma.karobariCandidate.create({
          data: {
            name: candidate.name,
            region: candidate.region,
            zoneId: zone.id,
            status: 'APPROVED', // Mark as approved/elected
            position: 'KAROBARI_MEMBER', // Default position
            isOnlineRegistration: false // These were nominated offline
          }
        })
        created++
        console.log(`✅ Created: ${candidate.name} (Zone: ${candidate.zoneCode})`)
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${candidate.name}:`, error.message)
      errors++
    }
  }
  
  // Update election status to COMPLETED
  try {
    await prisma.election.updateMany({
      where: {
        type: 'KAROBARI_MEMBERS'
      },
      data: {
        status: 'COMPLETED'
      }
    })
    console.log('\n✅ Election status updated to COMPLETED')
  } catch (error: any) {
    console.error('❌ Error updating election status:', error.message)
  }
  
  // Summary
  console.log('\n' + '=' .repeat(80))
  console.log('\n📊 Summary:')
  console.log(`   ✅ Created: ${created}`)
  console.log(`   ✅ Updated: ${updated}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log(`   📋 Total processed: ${created + updated}/${ELECTED_CANDIDATES.length}`)
  
  // Verify by zone
  console.log('\n📋 Verification by Zone:')
  for (const zone of Array.from(zoneMap.values()).sort((a, b) => a.code.localeCompare(b.code))) {
    const count = await prisma.karobariCandidate.count({
      where: {
        zoneId: zone.id,
        status: 'APPROVED'
      }
    })
    console.log(`   ${zone.code} (${zone.name}): ${count} approved candidates`)
  }
  
  console.log('\n' + '=' .repeat(80))
  console.log('\n✅ Registration completed!')
}

registerWinners()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Registration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

