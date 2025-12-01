import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Elected Karobari Samiti Members 2026-2029 (from the announcement)
const ELECTED_CANDIDATES = [
  // Garada-Lakhpat & Nakhatrana (2/2)
  { name: 'Deepak Ladharam Sharda', zone: 'GARADA' },
  { name: 'Kishor Mangaldas Somani', zone: 'GARADA' },
  
  // Abdasa (1/1)
  { name: 'Jayesh Jagdishbhai Ladhad', zone: 'ABDASA' },
  
  // Bhuj (3/3)
  { name: 'Pankaj Shamji Bhedakiya', zone: 'BHUJ' },
  { name: 'Hitesh (Pappubhai) Mangaldas Bhutada', zone: 'BHUJ' },
  { name: 'Jayantilal Chandrakant Mandan', zone: 'BHUJ' },
  
  // Anjar (1/1)
  { name: 'Gautam Damodarbhai Gagdani', zone: 'ANJAR' },
  
  // Anya Gujarat (3/3)
  { name: 'Mitaben Anil Bhutada', zone: 'ANYA_GUJARAT' },
  { name: 'Manilal Damodar Mall', zone: 'ANYA_GUJARAT' },
  { name: 'Bhavesh Mohanbhai Bhutada', zone: 'ANYA_GUJARAT' },
  
  // Mumbai (6/6)
  { name: 'Nandu Bhanji Gingal', zone: 'MUMBAI' },
  { name: 'Deepak Kishor Karwa', zone: 'MUMBAI' },
  { name: 'Jaymin Ramji Mall', zone: 'MUMBAI' },
  { name: 'Kiran Jamnadas Rathi', zone: 'MUMBAI' },
  { name: 'Raghuvir Kiritbhai Zaveri', zone: 'MUMBAI' },
  { name: 'Girish Jethalal Rathi', zone: 'MUMBAI' },
  
  // Raigad (4/4)
  { name: 'Latesh Bharat Mandan', zone: 'RAIGAD' },
  { name: 'Paresh Keshavji Karwa', zone: 'RAIGAD' },
  { name: 'Anjana Ashwin Bhutada', zone: 'RAIGAD' },
  { name: 'Alpeshkumar Harilal Bhutada', zone: 'RAIGAD' },
  
  // Karnataka & Goa (1/1)
  { name: 'Rajnikant Hirachand Ladhad', zone: 'KARNATAKA_GOA' }
]

// Helper function to normalize names for matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\([^)]*\)/g, '') // Remove text in parentheses
    .trim()
}

async function updateElectionResults() {
  console.log('📋 Updating Karobari Election Results 2026-2029\n')
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
  
  const zoneMap = new Map(zones.map(z => [z.code, z.id]))
  
  let updated = 0
  let notFound: Array<{ name: string; zone: string }> = []
  let multipleMatches: Array<{ name: string; zone: string; matches: number }> = []
  
  for (const elected of ELECTED_CANDIDATES) {
    const zoneId = zoneMap.get(elected.zone)
    
    if (!zoneId) {
      console.log(`⚠️  Zone not found: ${elected.zone}`)
      continue
    }
    
    // Find candidate by name (fuzzy match)
    const normalizedSearch = normalizeName(elected.name)
    
    // Try exact match first
    let candidates = await prisma.karobariCandidate.findMany({
      where: {
        zoneId: zoneId,
        status: { in: ['PENDING', 'APPROVED', 'SUBMITTED'] }
      }
    })
    
    // Try to find by normalized name
    let matched = candidates.find(c => {
      const candidateName = normalizeName(c.name)
      return candidateName === normalizedSearch || 
             candidateName.includes(normalizedSearch) ||
             normalizedSearch.includes(candidateName)
    })
    
    // If not found, try partial match
    if (!matched) {
      const nameParts = normalizedSearch.split(' ')
      matched = candidates.find(c => {
        const candidateName = normalizeName(c.name)
        return nameParts.some(part => part.length > 3 && candidateName.includes(part))
      })
    }
    
    if (!matched) {
      notFound.push(elected)
      console.log(`❌ Not found: ${elected.name} (Zone: ${elected.zone})`)
      continue
    }
    
    // Check for multiple matches
    const allMatches = candidates.filter(c => {
      const candidateName = normalizeName(c.name)
      return candidateName === normalizedSearch || 
             candidateName.includes(normalizedSearch) ||
             normalizedSearch.includes(candidateName)
    })
    
    if (allMatches.length > 1) {
      multipleMatches.push({
        name: elected.name,
        zone: elected.zone,
        matches: allMatches.length
      })
      console.log(`⚠️  Multiple matches for: ${elected.name} (${allMatches.length} candidates)`)
      console.log(`   Using: ${matched.name} (ID: ${matched.id})`)
    }
    
    // Update candidate status to APPROVED (elected)
    try {
      await prisma.karobariCandidate.update({
        where: { id: matched.id },
        data: {
          status: 'APPROVED' // Mark as approved/elected
        }
      })
      
      updated++
      console.log(`✅ Updated: ${matched.name} (Zone: ${elected.zone})`)
    } catch (error: any) {
      console.error(`❌ Error updating ${elected.name}:`, error.message)
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
  console.log(`   ✅ Successfully updated: ${updated}/${ELECTED_CANDIDATES.length}`)
  console.log(`   ❌ Not found: ${notFound.length}`)
  console.log(`   ⚠️  Multiple matches: ${multipleMatches.length}`)
  
  if (notFound.length > 0) {
    console.log('\n❌ Candidates not found in database:')
    notFound.forEach(c => {
      console.log(`   - ${c.name} (Zone: ${c.zone})`)
    })
  }
  
  if (multipleMatches.length > 0) {
    console.log('\n⚠️  Candidates with multiple matches (please verify):')
    multipleMatches.forEach(c => {
      console.log(`   - ${c.name} (Zone: ${c.zone}, Matches: ${c.matches})`)
    })
  }
  
  console.log('\n' + '=' .repeat(80))
  console.log('\n✅ Election results update completed!')
}

updateElectionResults()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

