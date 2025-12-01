import ExcelJS from 'exceljs'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_FILE = 'Final Date for Input 2.0.xlsx'

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
  'Anjar-Anya Gujarat': { karobari: 'ANJAR', trustee: 'ANJAR_ANYA_GUJARAT', yuvaPank: null }, // Will be split by city
  'Abdasa & Garda': { karobari: 'ABDASA', trustee: 'ABDASA_GARDA', yuvaPank: null },
  'Garda': { karobari: 'GARADA', trustee: 'ABDASA_GARDA', yuvaPank: null },
}

const ANJAR_CITIES = new Set(
  ['anjar', 'adipur', 'mandvi', 'mundra', 'gandhidham', 'gandhi dham', 'shenoi', 'shinoi', 'bhandariya', 'bhadreshwar', 'khedoi', 'rapar', 'varsamedi'].map((city) => city.toLowerCase())
)

type ZoneCache = Map<string, { id: string; name: string }>

function normalizePhone(value: any): string | null {
  if (value === null || value === undefined) return null
  
  // Check if it's "NA" (case insensitive)
  const str = value.toString().trim()
  if (str.toUpperCase() === 'NA' || str === '') return null
  
  let raw = value
  if (typeof value === 'object' && 'text' in (value as any)) {
    raw = (value as any).text
  }
  if (typeof raw === 'number') {
    raw = Math.trunc(raw).toString()
  }
  
  const digits = raw.toString().trim().replace(/\D/g, '')
  if (!digits) return null
  
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(-10)
  }
  
  if (digits.length === 10) {
    return digits
  }
  
  return null
}

function getCellValue(row: ExcelJS.Row, cell: number): any {
  const value = row.getCell(cell).value
  if (value === undefined || value === null) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && 'result' in value && (value as any).result !== undefined) {
    return (value as any).result
  }
  if (typeof value === 'object' && 'text' in value && (value as any).text !== undefined) {
    return (value as any).text
  }
  return value
}

function parseDob(raw: any): string | null {
  if (raw === null || raw === undefined) return null

  if (raw instanceof Date) {
    const day = raw.getDate().toString().padStart(2, '0')
    const month = (raw.getMonth() + 1).toString().padStart(2, '0')
    const year = raw.getFullYear()
    return `${day}/${month}/${year}`
  }

  if (typeof raw === 'number') {
    if (raw > 25569) {
      // Excel date serial number
      const epoch = new Date((raw - 25569) * 86400 * 1000)
      const day = epoch.getDate().toString().padStart(2, '0')
      const month = (epoch.getMonth() + 1).toString().padStart(2, '0')
      const year = epoch.getFullYear()
      return `${day}/${month}/${year}`
    }
    return null
  }

  if (typeof raw === 'object' && 'text' in raw) {
    return parseDob((raw as any).text)
  }

  const value = raw.toString().trim()
  if (!value) return null

  const parts = value.includes('-') ? value.split('-') : value.split('/')
  if (parts.length !== 3) return null

  let day = parts[0]
  let month = parts[1]
  let year = parts[2]

  if (year.length === 2) {
    year = year >= '50' ? `19${year}` : `20${year}`
  }

  const parsed = new Date(`${year}-${month}-${day}`)
  if (isNaN(parsed.getTime())) {
    return null
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
  votingRegion: string,
  age: number,
  cache: ZoneCache,
  city?: string | null
): {
  primary: { id: string; name: string } | null
  yuvaPankZoneId: string | null
  karobariZoneId: string | null
  trusteeZoneId: string | null
} {
  // Handle "Anjar-Anya Gujarat" split based on city
  let region = votingRegion
  if (votingRegion === 'Anjar-Anya Gujarat') {
    const cityName = city?.trim().toLowerCase() || ''
    if (ANJAR_CITIES.has(cityName)) {
      region = 'Anjar'
    } else {
      region = 'Anya Gujarat'
    }
  }
  
  const mapping = REGION_TO_ZONE_MAPPING[region] || REGION_TO_ZONE_MAPPING['Mumbai']
  
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

async function wipeAllVoters() {
  console.log('🗑️  Wiping all existing voter data...')
  
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
  
  console.log('✅ All voter data wiped successfully\n')
}

async function uploadV2Data(filePath: string) {
  console.log(`📥 Reading Excel file: ${filePath}`)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  let worksheet = workbook.getWorksheet(1)
  if (!worksheet) {
    worksheet = workbook.worksheets[0]
  }
  if (!worksheet) {
    throw new Error('No worksheet found in the Excel file')
  }

  console.log(`📊 Found worksheet with ${worksheet.rowCount} rows\n`)

  // Find column indices by reading header row
  const headerRow = worksheet.getRow(1)
  const columnMap: Record<string, number> = {}
  
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = cell.value?.toString().trim() || ''
    columnMap[header] = colNumber
  })

  console.log('📋 Column mapping:')
  Object.entries(columnMap).forEach(([name, index]) => {
    console.log(`   ${name}: Column ${index}`)
  })
  console.log()

  // Verify required columns exist
  const requiredColumns = ['VID NO.', 'Name', 'Voting Region', 'Mobile']
  const missingColumns = requiredColumns.filter(col => !columnMap[col])
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
  }
  
  console.log('✅ All required columns found\n')

  const zoneCache = await buildZoneCache()
  let processed = 0
  let skipped = 0
  let duplicates = 0
  let errors = 0

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const rowValues = Array.isArray(row.values) ? row.values : Object.values(row.values || {})
    if (rowValues.every((value: any) => value === null || value === undefined || value === '')) {
      continue
    }

    try {
      // Get values from columns based on actual Excel structure
      const voterId = columnMap['VID NO.'] ? getCellValue(row, columnMap['VID NO.'])?.toString().trim() : null
      const name = columnMap['Name'] ? getCellValue(row, columnMap['Name'])?.toString().trim() : null
      const dobRaw = columnMap['DOB'] ? getCellValue(row, columnMap['DOB']) : null
      const ageRaw = columnMap['AGE'] ? getCellValue(row, columnMap['AGE']) : null
      const phoneRaw = columnMap['Mobile'] ? getCellValue(row, columnMap['Mobile']) : null
      const email = columnMap['Mail ID'] ? getCellValue(row, columnMap['Mail ID'])?.toString().trim() || null : null
      const city = columnMap['City'] ? getCellValue(row, columnMap['City'])?.toString().trim() || null : null
      const votingRegion = columnMap['Voting Region'] ? getCellValue(row, columnMap['Voting Region'])?.toString().trim() : null

      // Skip if no phone or phone is "NA"
      const phone = normalizePhone(phoneRaw)
      if (!phone) {
        skipped++
        if (skipped <= 10) {
          console.log(`⚠️  Row ${rowNumber}: Skipped (no valid phone number)`)
        }
        continue
      }

      // Skip if missing required fields
      if (!voterId || !name || !votingRegion) {
        skipped++
        if (skipped <= 10) {
          console.log(`⚠️  Row ${rowNumber}: Skipped (missing required data)`)
        }
        continue
      }

      // Parse DOB and calculate age
      const dob = dobRaw ? parseDob(dobRaw) : null
      let age = ageRaw ? Number(ageRaw) : null
      
      if (!dob && !age) {
        skipped++
        if (skipped <= 10) {
          console.log(`⚠️  Row ${rowNumber}: Skipped (no DOB or age)`)
        }
        continue
      }

      if (dob) {
        age = calculateAgeFromDob(dob)
      }

      if (!age || age < 18) {
        skipped++
        if (skipped <= 10) {
          console.log(`⚠️  Row ${rowNumber}: Skipped (under 18, age: ${age})`)
        }
        continue
      }

      // Resolve zones based on Voting Region and city
      const zones = resolveZoneIds(votingRegion, age, zoneCache, city)
      if (!zones.primary) {
        skipped++
        if (skipped <= 10) {
          console.log(`⚠️  Row ${rowNumber}: Skipped (no zone found for region: ${votingRegion})`)
        }
        continue
      }

      // Create user
      const dateObj = dob ? (() => {
        const [day, month, year] = dob.split('/').map(Number)
        return new Date(year, month - 1, day)
      })() : new Date(new Date().getFullYear() - age, 0, 1)

      try {
        const user = await prisma.user.create({
          data: {
            name: name,
            phone: phone,
            email: email || `${phone}@voter.kms-election.com`,
            dateOfBirth: dateObj,
            age: age,
            role: 'VOTER',
          },
        })

        await prisma.voter.create({
          data: {
            userId: user.id,
            voterId: voterId,
            name: name,
            email: email,
            phone: phone,
            age: age,
            dob: dob || `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`,
            region: zones.primary.name || votingRegion,
            zoneId: zones.primary.id,
            yuvaPankZoneId: zones.yuvaPankZoneId,
            karobariZoneId: zones.karobariZoneId,
            trusteeZoneId: zones.trusteeZoneId,
            hasVoted: false,
            isActive: true,
          },
        })

        processed++
        if (processed % 100 === 0) {
          console.log(`  ✓ Processed ${processed} voters...`)
        }
      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          duplicates++
        } else {
          errors++
          if (errors <= 10) {
            console.error(`  ✗ Row ${rowNumber}: ${error.message}`)
          }
        }
      }
    } catch (error: any) {
      errors++
      if (errors <= 10) {
        console.error(`  ✗ Row ${rowNumber}: ${error.message}`)
      }
    }
  }

  console.log('\n✅ Upload summary')
  console.log(`   Processed: ${processed}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Duplicates: ${duplicates}`)
  console.log(`   Errors: ${errors}`)
}

async function main() {
  const filePath = process.argv[2] || DEFAULT_FILE
  
  try {
    // Step 1: Wipe all existing voters
    await wipeAllVoters()
    
    // Step 2: Upload new data
    await uploadV2Data(filePath)
    
    console.log('\n✅ Script completed successfully!')
  } catch (error) {
    console.error('\n❌ Script failed:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    await prisma.$disconnect()
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

