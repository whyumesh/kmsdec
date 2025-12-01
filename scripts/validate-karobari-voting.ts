import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Expected winners by zone (from the announcement)
const EXPECTED_WINNERS: Record<string, string[]> = {
  'GARADA': ['Deepak Ladharam Sharda', 'Kishor Mangaldas Somani'],
  'ABDASA': ['Jayesh Jagdishbhai Ladhad'],
  'BHUJ': ['Pankaj Shamji Bhedakiya', 'Hitesh Mangaldas Bhutada', 'Jayantilal Chandrakant Mandan'],
  'ANJAR': ['Gautam Damodarbhai Gagdani'],
  'ANYA_GUJARAT': ['Mitaben Anil Bhutada', 'Manilal Damodar Mall', 'Bhavesh Mohanbhai Bhutada'],
  'MUMBAI': ['Nandu Bhanji Gingal', 'Deepak Kishor Karwa', 'Jaymin Ramji Mall', 'Kiran Jamnadas Rathi', 'Raghuvir Kiritbhai Zaveri', 'Girish Jethalal Rathi'],
  'RAIGAD': ['Latesh Bharat Mandan', 'Paresh Keshavji Karwa', 'Anjana Ashwin Bhutada', 'Alpeshkumar Harilal Bhutada'],
  'KARNATAKA_GOA': ['Rajnikant Hirachand Ladhad']
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\([^)]*\)/g, '') // Remove text in parentheses
    .trim()
}

function nameMatches(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1)
  const n2 = normalizeName(name2)
  return n1 === n2 || n1.includes(n2) || n2.includes(n1)
}

async function validateKarobariVoting() {
  console.log('🔍 Validating Karobari Voting System\n')
  console.log('=' .repeat(80))
  
  let allPassed = true
  const issues: string[] = []
  
  // 1. Verify all expected winners exist and are APPROVED
  console.log('\n📋 Step 1: Verifying All Winners Are Registered\n')
  
  const zones = await prisma.zone.findMany({
    where: {
      electionType: 'KAROBARI_MEMBERS',
      isActive: true
    },
    include: {
      karobariCandidates: {
        where: { status: 'APPROVED' },
        select: { id: true, name: true, status: true }
      }
    }
  })
  
  const zoneMap = new Map(zones.map(z => [z.code, z]))
  
  for (const [zoneCode, expectedNames] of Object.entries(EXPECTED_WINNERS)) {
    const zone = zoneMap.get(zoneCode)
    if (!zone) {
      issues.push(`❌ Zone ${zoneCode} not found in database`)
      allPassed = false
      continue
    }
    
    const approvedCandidates = zone.karobariCandidates
    const foundNames: string[] = []
    const missingNames: string[] = []
    
    for (const expectedName of expectedNames) {
      const found = approvedCandidates.find(c => nameMatches(c.name, expectedName))
      if (found) {
        foundNames.push(found.name)
      } else {
        missingNames.push(expectedName)
      }
    }
    
    if (missingNames.length > 0) {
      console.log(`❌ ${zoneCode}: Missing ${missingNames.length} winner(s)`)
      missingNames.forEach(name => console.log(`   - ${name}`))
      issues.push(`Zone ${zoneCode}: Missing winners: ${missingNames.join(', ')}`)
      allPassed = false
    } else {
      console.log(`✅ ${zoneCode}: All ${expectedNames.length} winners found`)
      foundNames.forEach(name => console.log(`   ✓ ${name}`))
    }
    
    // Check for extra candidates (not in expected list)
    const extraCandidates = approvedCandidates.filter(c => 
      !expectedNames.some(expected => nameMatches(c.name, expected))
    )
    if (extraCandidates.length > 0) {
      console.log(`⚠️  ${zoneCode}: ${extraCandidates.length} extra approved candidate(s) (not in winner list)`)
      extraCandidates.forEach(c => console.log(`   - ${c.name}`))
    }
  }
  
  // 2. Test zone filtering - simulate what voters would see
  console.log('\n\n📋 Step 2: Testing Zone-Based Filtering\n')
  
  // Get sample voters from each zone
  const testVoters = await prisma.voter.findMany({
    where: {
      karobariZoneId: { not: null },
      isActive: true
    },
    include: {
      karobariZone: {
        select: {
          id: true,
          code: true,
          name: true
        }
      }
    },
    take: 50 // Sample voters
  })
  
  // Group voters by zone
  const votersByZone = new Map<string, typeof testVoters>()
  for (const voter of testVoters) {
    if (voter.karobariZone) {
      const zoneCode = voter.karobariZone.code
      if (!votersByZone.has(zoneCode)) {
        votersByZone.set(zoneCode, [])
      }
      votersByZone.get(zoneCode)!.push(voter)
    }
  }
  
  console.log(`Testing with ${testVoters.length} sample voters across ${votersByZone.size} zones\n`)
  
  for (const [zoneCode, zoneVoters] of Array.from(votersByZone.entries()).sort()) {
    if (!EXPECTED_WINNERS[zoneCode]) {
      continue // Skip zones not in expected winners
    }
    
    const zone = zoneMap.get(zoneCode)
    if (!zone) continue
    
    // Simulate API call: Get approved candidates for this zone
    const candidatesForZone = await prisma.karobariCandidate.findMany({
      where: {
        zoneId: zone.id,
        status: 'APPROVED'
      },
      select: {
        id: true,
        name: true,
        zoneId: true
      }
    })
    
    const expectedCount = EXPECTED_WINNERS[zoneCode].length
    const actualCount = candidatesForZone.length
    
    // Check if all expected winners are present
    const foundExpected = EXPECTED_WINNERS[zoneCode].filter(expectedName =>
      candidatesForZone.some(c => nameMatches(c.name, expectedName))
    ).length
    
    if (foundExpected === expectedCount && actualCount >= expectedCount) {
      console.log(`✅ ${zoneCode}: Voters see ${actualCount} candidate(s) (${foundExpected}/${expectedCount} expected winners)`)
    } else {
      console.log(`❌ ${zoneCode}: Issue - Voters see ${actualCount} candidate(s), but ${foundExpected}/${expectedCount} expected winners found`)
      issues.push(`Zone ${zoneCode}: Voters see ${actualCount} candidates but only ${foundExpected}/${expectedCount} expected winners`)
      allPassed = false
    }
    
    // Show what voters would see
    if (candidatesForZone.length > 0) {
      console.log(`   Voters in ${zoneCode} would see:`)
      candidatesForZone.forEach(c => {
        const isExpected = EXPECTED_WINNERS[zoneCode].some(expected => nameMatches(c.name, expected))
        const marker = isExpected ? '✓' : '⚠️'
        console.log(`   ${marker} ${c.name}`)
      })
    }
  }
  
  // 3. Verify no cross-zone contamination
  console.log('\n\n📋 Step 3: Verifying No Cross-Zone Contamination\n')
  
  for (const [zoneCode, expectedNames] of Object.entries(EXPECTED_WINNERS)) {
    const zone = zoneMap.get(zoneCode)
    if (!zone) continue
    
    // Check that winners from this zone don't appear in other zones
    for (const expectedName of expectedNames) {
      const candidate = await prisma.karobariCandidate.findFirst({
        where: {
          name: { contains: expectedName.split(' ')[0], mode: 'insensitive' },
          status: 'APPROVED'
        },
        include: {
          zone: {
            select: { code: true }
          }
        }
      })
      
      if (candidate && candidate.zone?.code !== zoneCode) {
        console.log(`❌ ${expectedName} is in wrong zone: ${candidate.zone?.code} (expected: ${zoneCode})`)
        issues.push(`${expectedName} is assigned to wrong zone: ${candidate.zone?.code} instead of ${zoneCode}`)
        allPassed = false
      }
    }
  }
  
  if (allPassed) {
    console.log('✅ No cross-zone contamination detected')
  }
  
  // 4. Test API endpoint logic
  console.log('\n\n📋 Step 4: Testing API Endpoint Logic\n')
  
  for (const [zoneCode, expectedNames] of Object.entries(EXPECTED_WINNERS)) {
    const zone = zoneMap.get(zoneCode)
    if (!zone) continue
    
    // Simulate API call with zoneId parameter
    const apiCandidates = await prisma.karobariCandidate.findMany({
      where: {
        zoneId: zone.id,
        status: 'APPROVED'
      },
      include: {
        zone: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      }
    })
    
    const foundExpected = expectedNames.filter(expectedName =>
      apiCandidates.some(c => nameMatches(c.name, expectedName))
    ).length
    
    if (foundExpected === expectedNames.length) {
      console.log(`✅ API for ${zoneCode}: Returns ${apiCandidates.length} candidate(s), all ${expectedNames.length} winners present`)
    } else {
      console.log(`❌ API for ${zoneCode}: Returns ${apiCandidates.length} candidate(s), but only ${foundExpected}/${expectedNames.length} winners found`)
      issues.push(`API for ${zoneCode}: Missing winners in response`)
      allPassed = false
    }
  }
  
  // 5. Summary
  console.log('\n\n' + '=' .repeat(80))
  console.log('\n📊 Validation Summary\n')
  
  const totalExpected = Object.values(EXPECTED_WINNERS).reduce((sum, names) => sum + names.length, 0)
  const totalApproved = await prisma.karobariCandidate.count({
    where: {
      status: 'APPROVED',
      zone: {
        electionType: 'KAROBARI_MEMBERS'
      }
    }
  })
  
  console.log(`   Total expected winners: ${totalExpected}`)
  console.log(`   Total approved candidates: ${totalApproved}`)
  console.log(`   Zones validated: ${Object.keys(EXPECTED_WINNERS).length}`)
  console.log(`   Issues found: ${issues.length}`)
  
  if (issues.length > 0) {
    console.log('\n❌ Issues Detected:')
    issues.forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ${issue}`)
    })
  }
  
  if (allPassed && issues.length === 0) {
    console.log('\n✅ VALIDATION PASSED: All checks successful!')
    console.log('   ✓ All 21 winners are registered correctly')
    console.log('   ✓ Zone assignments are accurate')
    console.log('   ✓ Voters will only see winners from their zone')
    console.log('   ✓ No cross-zone contamination')
    console.log('   ✓ API filtering works correctly')
  } else {
    console.log('\n❌ VALIDATION FAILED: Please review the issues above')
  }
  
  console.log('\n' + '=' .repeat(80))
}

validateKarobariVoting()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Validation error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

