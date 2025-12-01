import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Map region names to zone codes (matching the PDF filenames)
const regionToZoneMapping: Record<string, {
  yuvaPank: string | null
  karobari: string | null
  trustee: string | null
}> = {
  'Karnataka & Goa': {
    yuvaPank: 'KARNATAKA_GOA',
    karobari: 'KARNATAKA_GOA',
    trustee: 'KARNATAKA_GOA'
  },
  'Karnataka': {
    yuvaPank: 'KARNATAKA_GOA',
    karobari: 'KARNATAKA_GOA',
    trustee: 'KARNATAKA_GOA'
  },
  'Raigad': {
    yuvaPank: 'RAIGAD',
    karobari: 'RAIGAD',
    trustee: 'RAIGAD'
  },
  'Mumbai': {
    yuvaPank: null, // Not allowed for Yuva Pankh (only Karnataka & Goa and Raigad are allowed)
    karobari: 'MUMBAI',
    trustee: 'MUMBAI'
  },
  'Bhuj': {
    yuvaPank: null, // Not allowed for Yuva Pankh
    karobari: 'BHUJ',
    trustee: 'BHUJ'
  },
  'Kutch': {
    yuvaPank: null,
    karobari: 'KUTCH',
    trustee: 'BHUJ' // Bhuj for trustees
  },
  'Anjar': {
    yuvaPank: null,
    karobari: 'ANJAR',
    trustee: 'ANJAR_ANYA_GUJARAT'
  },
  'Anya Gujarat': {
    yuvaPank: null,
    karobari: 'ANYA_GUJARAT',
    trustee: 'ANJAR_ANYA_GUJARAT'
  }
}

async function findZoneId(code: string | null, electionType: string): Promise<string | null> {
  if (!code) return null
  
  const zone = await prisma.zone.findFirst({
    where: {
      code: code,
      electionType: electionType
    }
  })
  
  return zone?.id || null
}

async function fixVoterZones() {
  console.log('🔧 Starting voter zone reassignment...\n')
  
  // Get all voters
  const voters = await prisma.voter.findMany({
    select: {
      id: true,
      name: true,
      region: true,
      age: true,
      yuvaPankZoneId: true,
      karobariZoneId: true,
      trusteeZoneId: true,
    }
  })
  
  console.log(`📊 Found ${voters.length} voters to process\n`)
  
  let updated = 0
  let skipped = 0
  let errors = 0
  
  for (const voter of voters) {
    try {
      // Normalize region name
      const region = voter.region?.trim() || ''
      
      // Find matching zone mapping
      const mapping = regionToZoneMapping[region] || 
                     regionToZoneMapping[region.replace(/&/g, 'and')] ||
                     null
      
      if (!mapping) {
        console.log(`⚠️  Skipping ${voter.name}: Unknown region "${region}"`)
        skipped++
        continue
      }
      
      // Calculate age if not available
      let age = voter.age || 25 // Default age if not available
      
      // Find zones
      const yuvaPankZoneId = (age >= 18 && age <= 39 && mapping.yuvaPank) 
        ? await findZoneId(mapping.yuvaPank, 'YUVA_PANK')
        : null
      
      const karobariZoneId = (age >= 18)
        ? await findZoneId(mapping.karobari, 'KAROBARI_MEMBERS')
        : null
      
      const trusteeZoneId = (age >= 18)
        ? await findZoneId(mapping.trustee, 'TRUSTEES')
        : null
      
      // Check if zones need to be updated
      const needsUpdate = 
        voter.yuvaPankZoneId !== yuvaPankZoneId ||
        voter.karobariZoneId !== karobariZoneId ||
        voter.trusteeZoneId !== trusteeZoneId
      
      if (needsUpdate) {
        await prisma.voter.update({
          where: { id: voter.id },
          data: {
            yuvaPankZoneId: yuvaPankZoneId,
            karobariZoneId: karobariZoneId,
            trusteeZoneId: trusteeZoneId,
            // Also update zoneId for backward compatibility (use trustee as primary)
            zoneId: trusteeZoneId || karobariZoneId || yuvaPankZoneId
          }
        })
        
        updated++
        if (updated % 50 === 0) {
          console.log(`  ✓ Updated ${updated} voters...`)
        }
      } else {
        skipped++
      }
    } catch (error: any) {
      console.error(`  ✗ Error updating ${voter.name}: ${error.message}`)
      errors++
    }
  }
  
  console.log(`\n✅ Zone reassignment complete!`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Skipped (no changes needed): ${skipped}`)
  console.log(`   Errors: ${errors}`)
  
  // Show summary by region
  console.log(`\n📊 Summary by region:`)
  const regionCounts: Record<string, number> = {}
  for (const voter of voters) {
    const region = voter.region || 'Unknown'
    regionCounts[region] = (regionCounts[region] || 0) + 1
  }
  
  for (const [region, count] of Object.entries(regionCounts)) {
    console.log(`   ${region}: ${count} voters`)
  }
}

fixVoterZones()
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

