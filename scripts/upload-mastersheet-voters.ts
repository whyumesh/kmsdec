import { PrismaClient, Prisma } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env.local
function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value
        }
      }
    })
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const prisma = new PrismaClient()

const DEFAULT_FILE = 'Final Date for Input 2.0.csv'

// Map Voting Region to zone codes
const REGION_TO_ZONE_MAPPING: Record<string, { karobari: string; trustee: string; yuvaPank: string | null }> = {
  'Mumbai': { karobari: 'MUMBAI', trustee: 'MUMBAI', yuvaPank: null },
  'Raigad': { karobari: 'RAIGAD', trustee: 'RAIGAD', yuvaPank: 'RAIGAD' },
  'Karnataka & Goa': { karobari: 'KARNATAKA_GOA', trustee: 'KARNATAKA_GOA', yuvaPank: 'KARNATAKA_GOA' },
  'Karnataka-Goa': { karobari: 'KARNATAKA_GOA', trustee: 'KARNATAKA_GOA', yuvaPank: 'KARNATAKA_GOA' },
  'Bhuj': { karobari: 'BHUJ', trustee: 'BHUJ', yuvaPank: null },
  'Kutch': { karobari: 'KUTCH', trustee: 'ABDASA_GARDA', yuvaPank: null },
  'Anjar': { karobari: 'ANJAR', trustee: 'ANJAR_ANYA_GUJARAT', yuvaPank: null },
  'Anya Gujarat': { karobari: 'ANYA_GUJARAT', trustee: 'ANJAR_ANYA_GUJARAT', yuvaPank: null },
  'Anjar-Anya Gujarat': { karobari: 'ANJAR', trustee: 'ANJAR_ANYA_GUJARAT', yuvaPank: null },
  'Abdasa & Garda': { karobari: 'ABDASA', trustee: 'ABDASA_GARDA', yuvaPank: null },
  'Garda': { karobari: 'GARADA', trustee: 'ABDASA_GARDA', yuvaPank: null },
}

const ANJAR_CITIES = new Set(
  ['anjar', 'adipur', 'mandvi', 'mundra', 'gandhidham', 'gandhi dham', 'shenoi', 'shinoi', 'bhandariya', 'bhadreshwar', 'khedoi', 'rapar', 'varsamedi'].map((city) => city.toLowerCase())
)

type ZoneCache = Map<string, { id: string; name: string }>

function normalizePhone(value: string | null | undefined): string | null {
  if (!value || value.trim() === '' || value.toUpperCase() === 'NA' || value.toUpperCase() === 'N/A') {
    return null
  }
  
  const digits = value.toString().trim().replace(/\D/g, '')
  if (!digits) return null
  
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(-10)
  }
  
  if (digits.length === 10) {
    return digits
  }
  
  return null
}

function parseDob(dob: string): string | null {
  if (!dob || dob.trim() === '') return null
  
  const parts = dob.includes('-') ? dob.split('-') : dob.split('/')
  if (parts.length !== 3) return null
  
  let day = parts[0].trim()
  let month = parts[1].trim()
  let year = parts[2].trim()
  
  if (year.length === 2) {
    year = parseInt(year) >= 50 ? `19${year}` : `20${year}`
  }
  
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
}

function calculateAgeFromDob(dob: string): number {
  const [day, month, year] = dob.split('/').map(Number)
  const birthDate = new Date(year, month - 1, day)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }
  return age
}

function normalizeRegion(region: string, city: string | null): { karobari: string; trustee: string; yuvaPank: string | null } {
  const trimmedRegion = region?.trim() || ''
  
  if (trimmedRegion === 'Anjar-Anya Gujarat') {
    const cityName = city?.trim().toLowerCase() || ''
    if (ANJAR_CITIES.has(cityName)) {
      return REGION_TO_ZONE_MAPPING['Anjar']
    }
    return REGION_TO_ZONE_MAPPING['Anya Gujarat']
  }
  
  return REGION_TO_ZONE_MAPPING[trimmedRegion] || REGION_TO_ZONE_MAPPING['Mumbai']
}

async function buildZoneCache(): Promise<ZoneCache> {
  const zones = await prisma.zone.findMany({
    select: { id: true, code: true, electionType: true, name: true },
  })

  const cache: ZoneCache = new Map()
  zones.forEach((zone) => {
    cache.set(`${zone.code}:${zone.electionType}`, { id: zone.id, name: zone.name })
  })
  return cache
}

function resolveZoneIds(
  mapping: { karobari: string; trustee: string; yuvaPank: string | null },
  age: number,
  cache: ZoneCache
): {
  primary: { id: string; name: string } | null
  yuvaPankZoneId: string | null
  karobariZoneId: string | null
  trusteeZoneId: string | null
} {
  const getZone = (code: string | null, electionType: string) => {
    if (!code) return null
    return cache.get(`${code}:${electionType}`) || null
  }

  const yuva = age >= 18 && age <= 39 ? getZone(mapping.yuvaPank, 'YUVA_PANK') : null
  const karobari = age >= 18 ? getZone(mapping.karobari, 'KAROBARI_MEMBERS') : null
  const trustee = age >= 18 ? getZone(mapping.trustee, 'TRUSTEES') : null

  const primary = karobari || trustee || yuva || null

  return {
    primary,
    yuvaPankZoneId: yuva?.id || null,
    karobariZoneId: karobari?.id || null,
    trusteeZoneId: trustee?.id || null,
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = i < line.length - 1 ? line[i + 1] : ''
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // Add the last field
  result.push(current.trim())
  return result
}

async function uploadMastersheetVoters(filePath: string) {
  console.log(`📥 Reading CSV file: ${filePath}`)
  
  // Test database connection first
  try {
    console.log(`🔌 Testing database connection...`)
    await prisma.$connect()
    console.log(`✅ Database connection successful!\n`)
  } catch (error: any) {
    console.error(`❌ Database connection failed: ${error.message}`)
    console.error(`   Please check your DATABASE_URL in .env or .env.local`)
    throw error
  }
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const lines = fileContent.split('\n').filter(line => line.trim() !== '')
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row')
  }
  
  // Parse header
  const header = parseCSVLine(lines[0])
  console.log(`📋 Header columns: ${header.join(', ')}`)
  
  // Map CSV columns to database fields
  // CSV columns: Family No,VID NO.,Name,DOB,AGE,Mobile,Permenant Address,City,State,Voting Region,Mail ID
  const getColumnIndex = (name: string): number => {
    const index = header.findIndex(col => col.toLowerCase().includes(name.toLowerCase()))
    if (index === -1) throw new Error(`Column "${name}" not found in CSV`)
    return index
  }
  
  const colFamilyNo = header.findIndex(col => col.toLowerCase().includes('family'))
  const colVoterId = getColumnIndex('VID')
  const colName = getColumnIndex('Name')
  const colDob = getColumnIndex('DOB')
  const colAge = getColumnIndex('AGE')
  const colMobile = getColumnIndex('Mobile')
  const colAddress = getColumnIndex('Address')
  const colCity = getColumnIndex('City')
  const colState = getColumnIndex('State')
  const colRegion = getColumnIndex('Voting Region')
  const colEmail = header.findIndex(col => col.toLowerCase().includes('mail'))
  
  console.log(`\n📊 Column Mapping:`)
  console.log(`   Family No: Column ${colFamilyNo >= 0 ? colFamilyNo : 'N/A'}`)
  console.log(`   VID NO.: Column ${colVoterId}`)
  console.log(`   Name: Column ${colName}`)
  console.log(`   DOB: Column ${colDob}`)
  console.log(`   AGE: Column ${colAge}`)
  console.log(`   Mobile: Column ${colMobile}`)
  console.log(`   Permanent Address: Column ${colAddress}`)
  console.log(`   City: Column ${colCity}`)
  console.log(`   State: Column ${colState}`)
  console.log(`   Voting Region: Column ${colRegion}`)
  console.log(`   Mail ID: Column ${colEmail >= 0 ? colEmail : 'N/A'}`)
  
  console.log(`\n📊 Total rows in CSV: ${lines.length - 1} (excluding header)`)
  console.log(`⏳ This may take a few minutes. Please wait...\n`)
  
  const zoneCache = await buildZoneCache()
  let processed = 0
  let updated = 0
  let skipped = 0
  let duplicates = 0
  let errors = 0
  const skipReasons: Record<string, number> = {}
  
  console.log('\n🔄 Starting to process rows...\n')
  
  // Process in batches for better performance
  const BATCH_SIZE = 50
  const votersToCreate: Array<{
    userData: any
    voterData: any
  }> = []
  
  const processBatch = async (batch: Array<{ userData: any; voterData: any }>) => {
    for (const item of batch) {
      try {
        // Add a small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 10))
        // Check if voter already exists by voterId
        const existingVoter = await prisma.voter.findUnique({
          where: { voterId: item.voterData.voterId },
          include: { user: true }
        })
        
        if (existingVoter) {
          // Update existing voter
          if (existingVoter.user) {
            await prisma.user.update({
              where: { id: existingVoter.user.id },
              data: item.userData,
            })
          }
          
          await prisma.voter.update({
            where: { id: existingVoter.id },
            data: {
              ...item.voterData,
              userId: existingVoter.userId,
            },
          })
          updated++
        } else {
          // Create new voter
          const user = await prisma.user.create({
            data: item.userData,
          })
          
          await prisma.voter.create({
            data: {
              ...item.voterData,
              userId: user.id,
            },
          })
          processed++
        }
      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            duplicates++
            if (duplicates <= 10) {
              console.log(`  ⚠️  Duplicate entry for voter ID: ${item.voterData.voterId}`)
            }
          } else {
            errors++
            skipReasons['error'] = (skipReasons['error'] || 0) + 1
            if (errors <= 10) {
              console.error(`  ✗ Error: ${error.message}`)
            }
          }
        } else {
          errors++
          skipReasons['error'] = (skipReasons['error'] || 0) + 1
          if (errors <= 20) {
            console.error(`  ✗ Error processing voter ${item.voterData.voterId}: ${error.message}`)
            if (errors === 1) {
              console.error(`     Full error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
            }
          }
        }
      }
    }
  }
  
  for (let rowNumber = 1; rowNumber < lines.length; rowNumber++) {
    try {
      const line = lines[rowNumber]
      if (!line.trim()) {
        skipped++
        skipReasons['empty_line'] = (skipReasons['empty_line'] || 0) + 1
        continue
      }
      
      const values = parseCSVLine(line)
      
      // Skip if all values are empty
      if (values.every(v => !v || v.trim() === '')) {
        skipped++
        skipReasons['all_empty'] = (skipReasons['all_empty'] || 0) + 1
        continue
      }
      
      // Ensure we have enough columns
      if (values.length < Math.max(colVoterId, colName, colDob, colAge, colMobile, colRegion) + 1) {
        if (rowNumber <= 10) {
          console.log(`⚠️  Row ${rowNumber + 1}: Skipped (not enough columns - got ${values.length})`)
        }
        skipped++
        skipReasons['not_enough_columns'] = (skipReasons['not_enough_columns'] || 0) + 1
        continue
      }
      
      // Extract values from CSV
      const familyNo = colFamilyNo >= 0 ? values[colFamilyNo]?.trim() || null : null
      const voterId = values[colVoterId]?.trim() || ''
      const name = values[colName]?.trim() || ''
      const dob = parseDob(values[colDob] || '')
      const ageFromSheet = parseInt(values[colAge] || '0') || 0
      const phone = normalizePhone(values[colMobile] || '')
      const email = colEmail >= 0 && values[colEmail] ? (values[colEmail]?.trim() || null) : null
      const address = values[colAddress]?.trim() || null
      const city = values[colCity]?.trim() || null
      const state = values[colState]?.trim() || null
      const region = values[colRegion]?.trim() || ''
      
      // Validate required fields
      if (!voterId || !name || !dob) {
        if (rowNumber <= 10) {
          console.log(`⚠️  Row ${rowNumber + 1}: Skipped (missing required data - voterId: ${voterId || 'empty'}, name: ${name || 'empty'}, dob: ${dob || 'empty'})`)
        }
        skipped++
        skipReasons['missing_required'] = (skipReasons['missing_required'] || 0) + 1
        continue
      }
      
      // Calculate age
      const calculatedAge = dob ? calculateAgeFromDob(dob) : null
      const age = calculatedAge || ageFromSheet || 18
      
      // Skip voters under 18
      if (age < 18) {
        if (rowNumber <= 10) {
          console.log(`⚠️  Row ${rowNumber + 1}: Skipped (under 18, age: ${age})`)
        }
        skipped++
        skipReasons['under_18'] = (skipReasons['under_18'] || 0) + 1
        continue
      }
      
      // Resolve zones based on region
      const regionMapping = normalizeRegion(region, city)
      const zones = resolveZoneIds(regionMapping, age, zoneCache)
      
      if (!zones.primary) {
        if (rowNumber <= 10) {
          console.log(`⚠️  Row ${rowNumber + 1}: Skipped (no zone definition for region "${region}")`)
        }
        skipped++
        skipReasons[`no_zone_${region}`] = (skipReasons[`no_zone_${region}`] || 0) + 1
        continue
      }
      
      // Parse DOB to Date object
      const [day, month, year] = dob.split('/').map(Number)
      const dateObj = new Date(year, month - 1, day)
      
      // Generate placeholder phone if missing
      let phoneToUse = phone
      let emailToUse = email
      
      if (!phoneToUse) {
        const voterIdDigits = voterId.replace(/\D/g, '').slice(-6).padStart(6, '0')
        const rowDigits = String(rowNumber).slice(-2).padStart(2, '0')
        phoneToUse = `9999${voterIdDigits.slice(0, 4)}${rowDigits}`
        emailToUse = email || `${phoneToUse}@voter.kms-election.com`
        if (processed + updated < 20) {
          console.log(`  📞 Generated placeholder phone ${phoneToUse} for ${name} (${voterId})`)
        }
      } else {
        emailToUse = email || `${phoneToUse}@voter.kms-election.com`
      }
      
      // Prepare data for database
      votersToCreate.push({
        userData: {
          name,
          phone: phoneToUse,
          email: emailToUse,
          dateOfBirth: dateObj,
          age,
          role: 'VOTER' as const,
        },
        voterData: {
          voterId,
          name,
          email: emailToUse,
          phone: phoneToUse,
          age,
          dob,
          mulgam: city || state || address, // Store address info in mulgam field
          region: zones.primary.name || region,
          zoneId: zones.primary.id,
          yuvaPankZoneId: zones.yuvaPankZoneId,
          karobariZoneId: zones.karobariZoneId,
          trusteeZoneId: zones.trusteeZoneId,
          hasVoted: false,
          isActive: true,
        }
      })
      
      // Process batch when it reaches BATCH_SIZE or at the end
      if (votersToCreate.length >= BATCH_SIZE || rowNumber === lines.length - 1) {
        const batchSize = votersToCreate.length
        await processBatch(votersToCreate)
        votersToCreate.length = 0 // Clear array
        
        // Show progress every 50 voters or at the end
        if ((processed + updated) % 50 === 0 || rowNumber === lines.length - 1) {
          console.log(`  ✓ Processed ${processed} new, ${updated} updated, ${skipped} skipped, ${errors} errors, ${duplicates} duplicates... (${rowNumber}/${lines.length - 1} rows)`)
        }
      }
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        duplicates++
        if (duplicates <= 10) {
          console.log(`  ⚠️  Row ${rowNumber + 1}: Duplicate voter ID`)
        }
      } else {
        if (errors < 20) {
          console.error(`  ✗ Row ${rowNumber + 1}: ${error.message}`)
          if (errors === 0) {
            console.error(`     Stack: ${error.stack?.split('\n').slice(0, 3).join('\n')}`)
          }
        }
        errors++
        skipReasons['error'] = (skipReasons['error'] || 0) + 1
      }
    }
  }
  
  // Process any remaining voters in the batch
  if (votersToCreate.length > 0) {
    const batchSize = votersToCreate.length
    await processBatch(votersToCreate)
    votersToCreate.length = 0
  }
  
  console.log('\n📊 Skip reasons summary:')
  const sortedReasons = Object.entries(skipReasons).sort((a, b) => b[1] - a[1])
  sortedReasons.forEach(([reason, count]) => {
    console.log(`   ${reason}: ${count}`)
  })
  
  console.log('\n✅ Upload summary')
  console.log(`   New voters created: ${processed}`)
  console.log(`   Existing voters updated: ${updated}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Duplicates: ${duplicates}`)
  console.log(`   Errors: ${errors}`)
  console.log(`   Expected rows: ${lines.length - 1} (excluding header)`)
  console.log(`   Success rate: ${(((processed + updated) / (lines.length - 1)) * 100).toFixed(1)}%`)
  
  // Verify final count
  const finalCount = await prisma.voter.count()
  console.log(`\n📊 Final voter count in database: ${finalCount}`)
}

async function main() {
  console.log('🚀 Starting mastersheet voter upload script...\n')
  const filePath = process.argv[2] || DEFAULT_FILE
  console.log(`📁 File path: ${filePath}\n`)
  
  try {
    await uploadMastersheetVoters(filePath)
    console.log('\n✅ Script completed successfully!')
  } catch (error: any) {
    console.error('\n❌ Script failed:', error)
    console.error('Stack:', error.stack)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  })

