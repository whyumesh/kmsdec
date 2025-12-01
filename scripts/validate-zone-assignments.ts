import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Expected zone mappings based on region
const EXPECTED_ZONE_MAPPINGS: Record<string, {
  karobari: string | null
  trustee: string | null
  yuvaPank: string | null
}> = {
  'Mumbai': {
    karobari: 'MUMBAI',
    trustee: 'MUMBAI',
    yuvaPank: null // Not allowed for Yuva Pankh
  },
  'Raigad': {
    karobari: 'RAIGAD',
    trustee: 'RAIGAD',
    yuvaPank: 'RAIGAD'
  },
  'Karnataka & Goa': {
    karobari: 'KARNATAKA_GOA',
    trustee: 'KARNATAKA_GOA',
    yuvaPank: 'KARNATAKA_GOA'
  },
  'Bhuj': {
    karobari: 'BHUJ',
    trustee: 'BHUJ',
    yuvaPank: null // Not allowed for Yuva Pankh
  },
  'Kutch': {
    karobari: 'KUTCH',
    trustee: 'ABDASA_GARDA',
    yuvaPank: null // Not allowed for Yuva Pankh
  },
  'Anjar': {
    karobari: 'ANJAR',
    trustee: 'ANJAR_ANYA_GUJARAT',
    yuvaPank: null // Not allowed for Yuva Pankh
  },
  'Anya Gujarat': {
    karobari: 'ANYA_GUJARAT',
    trustee: 'ANJAR_ANYA_GUJARAT',
    yuvaPank: null // Not allowed for Yuva Pankh
  },
  'Abdasa & Garda': {
    karobari: null, // Kutch region voters go to ABDASA_GARDA trustee zone
    trustee: 'ABDASA_GARDA',
    yuvaPank: null
  }
}

async function validateZoneAssignments() {
  console.log('🔍 Comprehensive Zone Assignment Validation\n')
  console.log('=' .repeat(80))
  
  const allVoters = await prisma.voter.findMany({
    include: {
      yuvaPankZone: { select: { code: true, name: true } },
      karobariZone: { select: { code: true, name: true } },
      trusteeZone: { select: { code: true, name: true } }
    }
  })
  
  console.log(`\n📊 Total voters in database: ${allVoters.length}\n`)
  
  const errors: Array<{
    voterId: string
    name: string
    region: string
    age: number | null
    issue: string
  }> = []
  
  const warnings: Array<{
    voterId: string
    name: string
    region: string
    age: number | null
    issue: string
  }> = []
  
  // Validate each voter
  for (const voter of allVoters) {
    const region = voter.region || 'Unknown'
    const expected = EXPECTED_ZONE_MAPPINGS[region]
    
    if (!expected) {
      warnings.push({
        voterId: voter.voterId,
        name: voter.name,
        region,
        age: voter.age,
        issue: `Unknown region - no expected zone mapping`
      })
      continue
    }
    
    const age = voter.age || 0
    
    // Validate Karobari zone
    if (expected.karobari) {
      if (!voter.karobariZoneId) {
        errors.push({
          voterId: voter.voterId,
          name: voter.name,
          region,
          age,
          issue: `Missing Karobari zone (expected: ${expected.karobari})`
        })
      } else if (voter.karobariZone?.code !== expected.karobari) {
        errors.push({
          voterId: voter.voterId,
          name: voter.name,
          region,
          age,
          issue: `Wrong Karobari zone: ${voter.karobariZone?.code} (expected: ${expected.karobari})`
        })
      }
    } else {
      // Should not have Karobari zone
      if (voter.karobariZoneId) {
        warnings.push({
          voterId: voter.voterId,
          name: voter.name,
          region,
          age,
          issue: `Has Karobari zone but region doesn't require it: ${voter.karobariZone?.code}`
        })
      }
    }
    
    // Validate Trustee zone
    if (expected.trustee) {
      if (!voter.trusteeZoneId) {
        errors.push({
          voterId: voter.voterId,
          name: voter.name,
          region,
          age,
          issue: `Missing Trustee zone (expected: ${expected.trustee})`
        })
      } else if (voter.trusteeZone?.code !== expected.trustee) {
        errors.push({
          voterId: voter.voterId,
          name: voter.name,
          region,
          age,
          issue: `Wrong Trustee zone: ${voter.trusteeZone?.code} (expected: ${expected.trustee})`
        })
      }
    } else {
      if (voter.trusteeZoneId) {
        warnings.push({
          voterId: voter.voterId,
          name: voter.name,
          region,
          age,
          issue: `Has Trustee zone but region doesn't require it: ${voter.trusteeZone?.code}`
        })
      }
    }
    
    // Validate Yuva Pankh zone (age-based eligibility)
    if (age >= 18 && age <= 39) {
      // Eligible for Yuva Pankh
      if (expected.yuvaPank) {
        if (!voter.yuvaPankZoneId) {
          errors.push({
            voterId: voter.voterId,
            name: voter.name,
            region,
            age,
            issue: `Missing Yuva Pankh zone (age ${age}, expected: ${expected.yuvaPank})`
          })
        } else if (voter.yuvaPankZone?.code !== expected.yuvaPank) {
          errors.push({
            voterId: voter.voterId,
            name: voter.name,
            region,
            age,
            issue: `Wrong Yuva Pankh zone: ${voter.yuvaPankZone?.code} (expected: ${expected.yuvaPank})`
          })
        }
      } else {
        // Region doesn't allow Yuva Pankh, but voter is eligible by age
        // This is expected - no error
      }
    } else {
      // Not eligible for Yuva Pankh (age < 18 or age > 39)
      if (voter.yuvaPankZoneId) {
        errors.push({
          voterId: voter.voterId,
          name: voter.name,
          region,
          age,
          issue: `Has Yuva Pankh zone but age ${age} is not eligible (must be 18-39)`
        })
      }
    }
    
    // Check if voter is under 18
    if (age < 18) {
      warnings.push({
        voterId: voter.voterId,
        name: voter.name,
        region,
        age,
        issue: `Voter is under 18 years old (age: ${age})`
      })
    }
  }
  
  // Print results
  console.log('\n📋 Validation Results:\n')
  console.log(`   ✅ Total voters validated: ${allVoters.length}`)
  console.log(`   ❌ Errors found: ${errors.length}`)
  console.log(`   ⚠️  Warnings: ${warnings.length}`)
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS (Must be fixed):')
    console.log('=' .repeat(80))
    errors.slice(0, 20).forEach((error, idx) => {
      console.log(`\n${idx + 1}. ${error.name} (${error.voterId})`)
      console.log(`   Region: ${error.region}`)
      console.log(`   Age: ${error.age || 'N/A'}`)
      console.log(`   Issue: ${error.issue}`)
    })
    if (errors.length > 20) {
      console.log(`\n   ... and ${errors.length - 20} more errors`)
    }
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (Review recommended):')
    console.log('=' .repeat(80))
    warnings.slice(0, 10).forEach((warning, idx) => {
      console.log(`\n${idx + 1}. ${warning.name} (${warning.voterId})`)
      console.log(`   Region: ${warning.region}`)
      console.log(`   Age: ${warning.age || 'N/A'}`)
      console.log(`   Issue: ${warning.issue}`)
    })
    if (warnings.length > 10) {
      console.log(`\n   ... and ${warnings.length - 10} more warnings`)
    }
  }
  
  // Summary by region
  console.log('\n\n📊 Summary by Region:')
  console.log('=' .repeat(80))
  
  const regionGroups: Record<string, { total: number; errors: number; warnings: number }> = {}
  
  for (const voter of allVoters) {
    const region = voter.region || 'Unknown'
    if (!regionGroups[region]) {
      regionGroups[region] = { total: 0, errors: 0, warnings: 0 }
    }
    regionGroups[region].total++
  }
  
  for (const error of errors) {
    if (regionGroups[error.region]) {
      regionGroups[error.region].errors++
    }
  }
  
  for (const warning of warnings) {
    if (regionGroups[warning.region]) {
      regionGroups[warning.region].warnings++
    }
  }
  
  for (const [region, stats] of Object.entries(regionGroups).sort()) {
    const status = stats.errors === 0 ? '✅' : '❌'
    console.log(`\n${status} ${region}:`)
    console.log(`   Total voters: ${stats.total}`)
    console.log(`   Errors: ${stats.errors}`)
    console.log(`   Warnings: ${stats.warnings}`)
  }
  
  // Final verdict
  console.log('\n' + '=' .repeat(80))
  if (errors.length === 0) {
    console.log('\n✅ VALIDATION PASSED: All voters have correct zone assignments!')
  } else {
    console.log(`\n❌ VALIDATION FAILED: Found ${errors.length} errors that need to be fixed.`)
  }
  console.log('=' .repeat(80) + '\n')
}

validateZoneAssignments()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Validation failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

