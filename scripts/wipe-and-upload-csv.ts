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

async function wipeAllVoters() {
  console.log('🗑️  Wiping all existing voter data...\n')
  
  try {
    // Delete all votes first (foreign key constraint)
    const votesDeleted = await prisma.vote.deleteMany({})
    console.log(`   ✓ Deleted ${votesDeleted.count} votes`)
    
    // Delete all voters
    const votersDeleted = await prisma.voter.deleteMany({})
    console.log(`   ✓ Deleted ${votersDeleted.count} voters`)
    
    // Delete all users with role VOTER
    const usersDeleted = await prisma.user.deleteMany({
      where: { role: 'VOTER' }
    })
    console.log(`   ✓ Deleted ${usersDeleted.count} users`)
    
    console.log('\n✅ All voter data wiped successfully!\n')
  } catch (error: any) {
    console.error('\n❌ Error wiping data:', error)
    throw error
  }
}

async function uploadCSVData(filePath: string) {
  console.log(`📥 Reading CSV file: ${filePath}`)
  
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
  
  // Expected columns: Family No,VID NO.,Name,DOB,AGE,Mobile,Permenant Address,City,State,Voting Region,Mail ID
  const getColumnIndex = (name: string): number => {
    const index = header.findIndex(col => col.toLowerCase().includes(name.toLowerCase()))
    if (index === -1) throw new Error(`Column "${name}" not found in CSV`)
    return index
  }
  
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
  
  console.log(`📊 Total rows in CSV: ${lines.length - 1} (excluding header)`)
  
  const zoneCache = await buildZoneCache()
  let processed = 0
  let skipped = 0
  let duplicates = 0
  let errors = 0
  const skipReasons: Record<string, number> = {}
  
  console.log('\n🔄 Starting to process rows...\n')
  
  // Process in batches for better performance
  const BATCH_SIZE = 100
  const votersToCreate: Array<{
    userData: any
    voterData: any
  }> = []
  
  const processBatch = async (batch: Array<{ userData: any; voterData: any }>) => {
    for (const item of batch) {
      try {
        const user = await prisma.user.create({
          data: item.userData,
        })
        
        await prisma.voter.create({
          data: {
            ...item.voterData,
            userId: user.id,
          },
        })
      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          duplicates++
        } else {
          errors++
          skipReasons['error'] = (skipReasons['error'] || 0) + 1
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
        console.log(`⚠️  Row ${rowNumber + 1}: Skipped (not enough columns - got ${values.length}, expected at least ${Math.max(colVoterId, colName, colDob, colAge, colMobile, colRegion) + 1})`)
        skipped++
        skipReasons['not_enough_columns'] = (skipReasons['not_enough_columns'] || 0) + 1
        continue
      }
      
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
      
      if (!voterId || !name || !dob) {
        if (rowNumber <= 10 || processed < 100) {
          console.log(`⚠️  Row ${rowNumber + 1}: Skipped (missing required data - voterId: ${voterId || 'empty'}, name: ${name || 'empty'}, dob: ${dob || 'empty'})`)
        }
        skipped++
        skipReasons['missing_required'] = (skipReasons['missing_required'] || 0) + 1
        continue
      }
      
      const calculatedAge = calculateAgeFromDob(dob)
      const age = calculatedAge || ageFromSheet || 18
      
      if (age < 18) {
        if (rowNumber <= 10 || processed < 100) {
          console.log(`⚠️  Row ${rowNumber + 1}: Skipped (under 18, age: ${age})`)
        }
        skipped++
        skipReasons['under_18'] = (skipReasons['under_18'] || 0) + 1
        continue
      }
      
      const regionMapping = normalizeRegion(region, city)
      const zones = resolveZoneIds(regionMapping, age, zoneCache)
      
      if (!zones.primary) {
        if (rowNumber <= 10 || processed < 100) {
          console.log(`⚠️  Row ${rowNumber + 1}: Skipped (no zone definition for region "${region}")`)
        }
        skipped++
        skipReasons[`no_zone_${region}`] = (skipReasons[`no_zone_${region}`] || 0) + 1
        continue
      }
      
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
        if (processed < 20) {
          console.log(`  📞 Generated placeholder phone ${phoneToUse} for ${name} (${voterId})`)
        }
      } else {
        emailToUse = email || `${phoneToUse}@voter.kms-election.com`
      }
      
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
          mulgam: city || state || address,
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
        processed += batchSize
        votersToCreate.length = 0 // Clear array
        
        if (processed % 500 === 0 || rowNumber === lines.length - 1) {
          console.log(`  ✓ Processed ${processed} voters... (skipped: ${skipped}, errors: ${errors}, duplicates: ${duplicates})`)
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
    processed += batchSize
    votersToCreate.length = 0
  }
  
  console.log('\n📊 Skip reasons summary:')
  const sortedReasons = Object.entries(skipReasons).sort((a, b) => b[1] - a[1])
  sortedReasons.forEach(([reason, count]) => {
    console.log(`   ${reason}: ${count}`)
  })
  
  console.log('\n✅ Upload summary')
  console.log(`   Processed: ${processed}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Duplicates: ${duplicates}`)
  console.log(`   Errors: ${errors}`)
  console.log(`   Expected rows: ${lines.length - 1} (excluding header)`)
  console.log(`   Success rate: ${((processed / (lines.length - 1)) * 100).toFixed(1)}%`)
  
  // Verify final count
  const finalCount = await prisma.voter.count()
  console.log(`\n📊 Final voter count in database: ${finalCount}`)
  
  if (finalCount < lines.length - 1) {
    console.log(`\n⚠️  WARNING: Expected ${lines.length - 1} voters but only ${finalCount} were uploaded!`)
    console.log(`   This suggests ${lines.length - 1 - finalCount} voters were skipped or failed.`)
  }
}

async function main() {
  console.log('🚀 Starting wipe and upload script...\n')
  const filePath = process.argv[2] || DEFAULT_FILE
  console.log(`📁 File path: ${filePath}\n`)
  
  try {
    // Step 1: Wipe all existing voters
    await wipeAllVoters()
    
    // Step 2: Upload new data
    await uploadCSVData(filePath)
    
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

