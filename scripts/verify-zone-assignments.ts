import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyZoneAssignments() {
  console.log('🔍 Verifying Voter Zone Assignments...\n')
  
  // Get voters grouped by region
  const regions = await prisma.voter.groupBy({
    by: ['region'],
    _count: true
  })
  
  console.log('📊 Zone Assignment Verification by Region:\n')
  
  for (const regionData of regions) {
    const region = regionData.region || 'Unknown'
    const count = regionData._count
    
    console.log(`📍 ${region}: ${count} voters`)
    
    // Get sample voters from this region
    const sampleVoters = await prisma.voter.findMany({
      where: { region: region },
      take: 5,
      include: {
        yuvaPankZone: {
          select: { code: true, name: true }
        },
        karobariZone: {
          select: { code: true, name: true }
        },
        trusteeZone: {
          select: { code: true, name: true }
        }
      }
    })
    
    // Count zone assignments
    const yuvaPankCount = await prisma.voter.count({
      where: {
        region: region,
        yuvaPankZoneId: { not: null }
      }
    })
    
    const karobariCount = await prisma.voter.count({
      where: {
        region: region,
        karobariZoneId: { not: null }
      }
    })
    
    const trusteeCount = await prisma.voter.count({
      where: {
        region: region,
        trusteeZoneId: { not: null }
      }
    })
    
    console.log(`   ✅ Yuva Pankh zones: ${yuvaPankCount}/${count}`)
    console.log(`   ✅ Karobari zones: ${karobariCount}/${count}`)
    console.log(`   ✅ Trustee zones: ${trusteeCount}/${count}`)
    
    // Show sample assignments
    console.log(`\n   📋 Sample Voter Assignments:`)
    for (const voter of sampleVoters.slice(0, 3)) {
      console.log(`      • ${voter.name} (Age: ${voter.age || 'N/A'})`)
      if (voter.yuvaPankZone) {
        console.log(`        Yuva Pankh: ${voter.yuvaPankZone.code} (${voter.yuvaPankZone.name})`)
      } else {
        console.log(`        Yuva Pankh: Not assigned (age ${voter.age || 'N/A'} - must be 18-39)`)
      }
      if (voter.karobariZone) {
        console.log(`        Karobari: ${voter.karobariZone.code} (${voter.karobariZone.name})`)
      } else {
        console.log(`        Karobari: Not assigned`)
      }
      if (voter.trusteeZone) {
        console.log(`        Trustee: ${voter.trusteeZone.code} (${voter.trusteeZone.name})`)
      } else {
        console.log(`        Trustee: Not assigned`)
      }
    }
    
    // Check for incorrect assignments (voters assigned to wrong zones)
    const expectedKarobari = getExpectedZoneCode(region, 'KAROBARI_MEMBERS')
    const expectedTrustee = getExpectedZoneCode(region, 'TRUSTEES')
    const mismatchConditions: any[] = []
    
    if (expectedKarobari) {
      mismatchConditions.push({ karobariZoneId: null })
      mismatchConditions.push({
        karobariZone: { code: { not: expectedKarobari } }
      })
    } else {
      mismatchConditions.push({ karobariZoneId: { not: null } })
    }
    
    if (expectedTrustee) {
      mismatchConditions.push({ trusteeZoneId: null })
      mismatchConditions.push({
        trusteeZone: { code: { not: expectedTrustee } }
      })
    } else {
      mismatchConditions.push({ trusteeZoneId: { not: null } })
    }
    
    const incorrectAssignments = mismatchConditions.length > 0
      ? await prisma.voter.findMany({
          where: {
            region: region,
            OR: mismatchConditions
          },
          take: 5,
          include: {
            karobariZone: { select: { code: true } },
            trusteeZone: { select: { code: true } }
          }
        })
      : []
    
    if (incorrectAssignments.length > 0) {
      console.log(`\n   ⚠️  Found ${incorrectAssignments.length} potentially incorrect assignments:`)
      for (const voter of incorrectAssignments) {
        console.log(`      • ${voter.name}`)
        console.log(`        Expected Karobari: ${getExpectedZoneCode(region, 'KAROBARI_MEMBERS')}, Got: ${voter.karobariZone?.code || 'None'}`)
        console.log(`        Expected Trustee: ${getExpectedZoneCode(region, 'TRUSTEES')}, Got: ${voter.trusteeZone?.code || 'None'}`)
      }
    } else {
      console.log(`\n   ✅ All voters correctly assigned to their region's zones!`)
    }
    
    console.log('')
  }
  
  // Overall summary
  const totalVoters = await prisma.voter.count()
  const votersWithZones = await prisma.voter.count({
    where: {
      OR: [
        { karobariZoneId: { not: null } },
        { trusteeZoneId: { not: null } },
        { yuvaPankZoneId: { not: null } }
      ]
    }
  })
  
  console.log('📊 Overall Summary:')
  console.log(`   Total voters: ${totalVoters}`)
  console.log(`   Voters with zone assignments: ${votersWithZones}`)
  console.log(`   Coverage: ${((votersWithZones / totalVoters) * 100).toFixed(1)}%`)
  console.log('')
  
  console.log('✅ Zone assignment verification complete!')
}

function getExpectedZoneCode(region: string, electionType: string): string | null {
  const mapping: Record<string, { karobari: string | null; trustee: string | null }> = {
    'Raigad': { karobari: 'RAIGAD', trustee: 'RAIGAD' },
    'Mumbai': { karobari: 'MUMBAI', trustee: 'MUMBAI' },
    'Karnataka & Goa': { karobari: 'KARNATAKA_GOA', trustee: 'KARNATAKA_GOA' },
    'Karnataka': { karobari: 'KARNATAKA_GOA', trustee: 'KARNATAKA_GOA' },
    'Bhuj': { karobari: 'BHUJ', trustee: 'BHUJ' },
    'Kutch': { karobari: 'KUTCH', trustee: 'ABDASA_GARDA' },
    'Abdasa & Garda': { karobari: null, trustee: 'ABDASA_GARDA' },
    'Anjar': { karobari: 'ANJAR', trustee: 'ANJAR_ANYA_GUJARAT' },
    'Anya Gujarat': { karobari: 'ANYA_GUJARAT', trustee: 'ANJAR_ANYA_GUJARAT' },
    'Anjar-Anya Gujarat': { karobari: 'ANYA_GUJARAT', trustee: 'ANJAR_ANYA_GUJARAT' }
  }
  
  if (electionType === 'KAROBARI_MEMBERS') {
    return mapping[region]?.karobari || null
  } else if (electionType === 'TRUSTEES') {
    return mapping[region]?.trustee || null
  }
  
  return null
}

verifyZoneAssignments()
  .then(() => {
    console.log('✅ Verification completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


