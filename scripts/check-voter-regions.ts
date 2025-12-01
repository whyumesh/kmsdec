import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkVoterRegions() {
  console.log('🔍 Checking voter regions and zone assignments...\n')
  
  // Get all voters with their zones
  const voters = await prisma.voter.findMany({
    include: {
      yuvaPankZone: {
        select: { code: true, name: true, electionType: true }
      },
      karobariZone: {
        select: { code: true, name: true, electionType: true }
      },
      trusteeZone: {
        select: { code: true, name: true, electionType: true }
      }
    }
  })
  
  console.log(`📊 Total voters: ${voters.length}\n`)
  
  // Group by region
  const regionGroups: Record<string, any[]> = {}
  for (const voter of voters) {
    const region = voter.region || 'Unknown'
    if (!regionGroups[region]) {
      regionGroups[region] = []
    }
    regionGroups[region].push(voter)
  }
  
  console.log('📋 Voters by Region:')
  for (const [region, regionVoters] of Object.entries(regionGroups)) {
    console.log(`\n  ${region}: ${regionVoters.length} voters`)
    
    // Check zone assignments
    const withYuvaPank = regionVoters.filter(v => v.yuvaPankZoneId).length
    const withKarobari = regionVoters.filter(v => v.karobariZoneId).length
    const withTrustee = regionVoters.filter(v => v.trusteeZoneId).length
    
    console.log(`    - Yuva Pankh zones: ${withYuvaPank}`)
    console.log(`    - Karobari zones: ${withKarobari}`)
    console.log(`    - Trustee zones: ${withTrustee}`)
    
    // Show sample zone assignments
    const sample = regionVoters[0]
    if (sample) {
      console.log(`    Sample voter zones:`)
      if (sample.yuvaPankZone) {
        console.log(`      Yuva Pankh: ${sample.yuvaPankZone.code} (${sample.yuvaPankZone.name})`)
      } else {
        console.log(`      Yuva Pankh: None`)
      }
      if (sample.karobariZone) {
        console.log(`      Karobari: ${sample.karobariZone.code} (${sample.karobariZone.name})`)
      } else {
        console.log(`      Karobari: None`)
      }
      if (sample.trusteeZone) {
        console.log(`      Trustee: ${sample.trusteeZone.code} (${sample.trusteeZone.name})`)
      } else {
        console.log(`      Trustee: None`)
      }
    }
  }
  
  // Check all available zones in database
  console.log('\n\n🗺️  Available Zones in Database:')
  const zones = await prisma.zone.findMany({
    where: { isActive: true },
    select: {
      code: true,
      name: true,
      electionType: true,
      seats: true
    },
    orderBy: [
      { electionType: 'asc' },
      { code: 'asc' }
    ]
  })
  
  const zonesByType: Record<string, any[]> = {}
  for (const zone of zones) {
    if (!zonesByType[zone.electionType]) {
      zonesByType[zone.electionType] = []
    }
    zonesByType[zone.electionType].push(zone)
  }
  
  for (const [electionType, typeZones] of Object.entries(zonesByType)) {
    console.log(`\n  ${electionType}:`)
    for (const zone of typeZones) {
      console.log(`    - ${zone.code}: ${zone.name} (${zone.seats} seats)`)
    }
  }
  
  // Show voters with missing zones
  console.log('\n\n⚠️  Voters with Missing Zones:')
  const missingZones = voters.filter(v => 
    !v.yuvaPankZoneId && !v.karobariZoneId && !v.trusteeZoneId
  )
  console.log(`  Total: ${missingZones.length}`)
  if (missingZones.length > 0 && missingZones.length <= 10) {
    missingZones.forEach(v => {
      console.log(`    - ${v.name} (${v.region || 'Unknown region'}, age: ${v.age || 'N/A'})`)
    })
  }
}

checkVoterRegions()
  .then(() => {
    console.log('\n✅ Check completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

