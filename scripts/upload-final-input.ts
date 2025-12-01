import ExcelJS from 'exceljs'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

type ZoneCodeMapping = {
  label: string
  yuvaPank: string | null
  karobari: string | null
  trustee: string | null
}

type PreparedRow = {
  rowNumber: number
  voterId: string
  name: string
  dob: string
  age: number
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  regionMapping: ZoneCodeMapping
}

const DEFAULT_FILE = 'Final Data for Input.xlsx'

const ANJAR_CITIES = new Set(
  [
    'anjar',
    'adipur',
    'mandvi',
    'mundra',
    'gandhidham',
    'gandhi dham',
    'shenoi',
    'shinoi',
    'bhandariya',
    'bhadreshwar',
    'khedoi',
    'rapar',
    'varsamedi',
  ].map((city) => city.toLowerCase())
)

const REGION_MAPPINGS: Record<string, ZoneCodeMapping> = {
  Mumbai: {
    label: 'Mumbai',
    yuvaPank: null,
    karobari: 'MUMBAI',
    trustee: 'MUMBAI',
  },
  Raigad: {
    label: 'Raigad',
    yuvaPank: 'RAIGAD',
    karobari: 'RAIGAD',
    trustee: 'RAIGAD',
  },
  'Karnataka & Goa': {
    label: 'Karnataka & Goa',
    yuvaPank: 'KARNATAKA_GOA',
    karobari: 'KARNATAKA_GOA',
    trustee: 'KARNATAKA_GOA',
  },
  Bhuj: {
    label: 'Bhuj',
    yuvaPank: null,
    karobari: 'BHUJ',
    trustee: 'BHUJ',
  },
  Kutch: {
    label: 'Kutch',
    yuvaPank: null,
    karobari: 'KUTCH',
    trustee: 'ABDASA_GARDA',
  },
  Anjar: {
    label: 'Anjar',
    yuvaPank: null,
    karobari: 'ANJAR',
    trustee: 'ANJAR_ANYA_GUJARAT',
  },
  'Anya Gujarat': {
    label: 'Anya Gujarat',
    yuvaPank: null,
    karobari: 'ANYA_GUJARAT',
    trustee: 'ANJAR_ANYA_GUJARAT',
  },
  'Abdasa & Garda': {
    label: 'Abdasa & Garda',
    yuvaPank: null,
    karobari: 'ABDASA', // Using ABDASA as the Karobari zone for Abdasa & Garda
    trustee: 'ABDASA_GARDA',
  },
}

const REGION_ALIAS: Record<string, string> = {
  'Karnataka-Goa': 'Karnataka & Goa',
}

type ZoneCache = Map<string, { id: string; name: string }>

function normalizePhone(value: any): string | null {
  if (value === null || value === undefined) return null
  
  // Handle "NA" or "N/A" strings
  const stringValue = value.toString().trim().toUpperCase()
  if (stringValue === 'NA' || stringValue === 'N/A' || stringValue === '') {
    return null
  }
  
  let raw = value

  if (typeof value === 'object' && 'text' in (value as any)) {
    raw = (value as any).text
  }

  if (typeof raw === 'number') {
    raw = Math.trunc(raw).toString()
  }

  const digits = raw
    .toString()
    .trim()
    .replace(/\D/g, '')

  if (!digits) return null

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(-10)
  }

  if (digits.length === 10) {
    return digits
  }

  return null
}

function excelDateToDayMonthYear(value: number): string {
  const epoch = new Date((value - 25569) * 86400 * 1000)
  return formatDate(epoch)
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function parseDob(raw: any): string | null {
  if (raw === null || raw === undefined) return null

  if (raw instanceof Date) {
    return formatDate(raw)
  }

  if (typeof raw === 'number') {
    if (raw > 25569) {
      return excelDateToDayMonthYear(raw)
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

  return formatDate(parsed)
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

function normalizeRegion(region: string | null, city: string | null): ZoneCodeMapping {
  const trimmedRegion = region?.trim() || ''
  const normalized = REGION_ALIAS[trimmedRegion] || trimmedRegion

  if (normalized === 'Anjar-Anya Gujarat') {
    const cityName = city?.trim().toLowerCase() || ''
    if (ANJAR_CITIES.has(cityName)) {
      return REGION_MAPPINGS['Anjar']
    }
    return REGION_MAPPINGS['Anya Gujarat']
  }

  return (
    REGION_MAPPINGS[normalized] ||
    REGION_MAPPINGS['Mumbai']
  )
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
  mapping: ZoneCodeMapping,
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

function parseWorksheetRow(row: ExcelJS.Row, rowNumber: number): PreparedRow | null {
  const voterId = (getCellValue(row, 2) ?? '').toString().trim()
  const name = (getCellValue(row, 3) ?? '').toString().trim()
  const dob = parseDob(getCellValue(row, 4))
  const ageFromSheet = Number(getCellValue(row, 5) ?? 0)
  const phone = normalizePhone(getCellValue(row, 6))
  const email = (getCellValue(row, 11) ?? '').toString().trim() || null
  const address = (getCellValue(row, 7) ?? '').toString().trim() || null
  const city = (getCellValue(row, 8) ?? '').toString().trim() || null
  const state = (getCellValue(row, 9) ?? '').toString().trim() || null
  const region = (getCellValue(row, 10) ?? '').toString().trim()

  // Phone is now optional - allow NA/null values
  if (!voterId || !name || !dob) {
    console.log(
      `⚠️  Row ${rowNumber}: Skipped (missing required data - voterId: ${voterId}, name: ${name}, dob: ${dob})`
    )
    return null
  }
  
  // Log if phone is missing but continue processing
  if (!phone) {
    console.log(
      `ℹ️  Row ${rowNumber}: No phone number (will use placeholder) - ${name} (${voterId})`
    )
  }

  const calculatedAge = calculateAgeFromDob(dob)
  if (calculatedAge < 18) {
    console.log(`⚠️  Row ${rowNumber}: Skipped (under 18)`)
    return null
  }

  const regionMapping = normalizeRegion(region, city)

  return {
    rowNumber,
    voterId,
    name,
    dob,
    age: calculatedAge || ageFromSheet || 18,
    phone,
    email,
    address,
    city,
    state,
    regionMapping,
  }
}

async function uploadFinalData(filePath: string) {
  console.log(`📥 Reading Excel file: ${filePath}`)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  // Use "MASTER DATA to Import" sheet specifically
  let worksheet = workbook.getWorksheet('MASTER DATA to Import')
  if (!worksheet) {
    // Fallback to first sheet if exact name not found
    worksheet = workbook.getWorksheet(1)
    if (!worksheet) {
      worksheet = workbook.worksheets[0]
    }
  }
  if (!worksheet) {
    throw new Error('No worksheet found in the Excel file')
  }
  
  console.log(`📋 Using sheet: "${worksheet.name}"`)
  console.log(`📊 Total rows in sheet: ${worksheet.rowCount}`)

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

    const parsed = parseWorksheetRow(row, rowNumber)
    if (!parsed) {
      skipped++
      continue
    }

    const zones = resolveZoneIds(parsed.regionMapping, parsed.age, zoneCache)
    if (!zones.primary) {
      console.log(`⚠️  Row ${rowNumber}: No zone definition for region ${parsed.regionMapping.label}`)
      skipped++
      continue
    }

    try {
      const dateObj = (() => {
        const [day, month, year] = parsed.dob.split('/').map(Number)
        return new Date(year, month - 1, day)
      })()

      // Generate placeholder phone if missing (format: 9999XXXXXX where X is last 6 digits of voterId)
      let phoneToUse = parsed.phone
      let emailToUse = parsed.email
      
      if (!phoneToUse) {
        // Generate a unique placeholder phone number based on voterId
        // Extract last 6 digits from voterId, pad with zeros if needed
        // Use row number as additional uniqueness factor to avoid collisions
        const voterIdDigits = parsed.voterId.replace(/\D/g, '').slice(-6).padStart(6, '0')
        const rowDigits = String(parsed.rowNumber).slice(-2).padStart(2, '0')
        phoneToUse = `9999${voterIdDigits.slice(0, 4)}${rowDigits}` // 9999 prefix + 4 digits from voterId + 2 digits from row
        emailToUse = parsed.email ?? `${phoneToUse}@voter.kms-election.com`
        console.log(`  📞 Generated placeholder phone ${phoneToUse} for ${parsed.name} (${parsed.voterId})`)
      } else {
        emailToUse = parsed.email ?? `${phoneToUse}@voter.kms-election.com`
      }

      const user = await prisma.user.create({
        data: {
          name: parsed.name,
          phone: phoneToUse,
          email: emailToUse,
          dateOfBirth: dateObj,
          age: parsed.age,
          role: 'VOTER',
        },
      })

      await prisma.voter.create({
        data: {
          userId: user.id,
          voterId: parsed.voterId,
          name: parsed.name,
          email: parsed.email,
          phone: phoneToUse, // Use placeholder if original was null
          age: parsed.age,
          dob: parsed.dob,
          mulgam: parsed.city || parsed.state || parsed.address,
          region: zones.primary.name ?? parsed.regionMapping.label,
          zoneId: zones.primary.id,
          yuvaPankZoneId: zones.yuvaPankZoneId,
          karobariZoneId: zones.karobariZoneId,
          trusteeZoneId: zones.trusteeZoneId,
          hasVoted: false,
          isActive: true,
        },
      })

      processed++
      if (processed % 50 === 0) {
        console.log(`  ✓ Processed ${processed} voters...`)
      }
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        duplicates++
      } else {
        console.error(`  ✗ Row ${rowNumber}: ${error.message}`)
        errors++
      }
    }
  }

  console.log('\n✅ Upload summary')
  console.log(`   Processed: ${processed}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Duplicates: ${duplicates}`)
  console.log(`   Errors: ${errors}`)
  console.log(`   Expected rows: ${worksheet.rowCount - 1} (excluding header)`)
  console.log(`   Success rate: ${((processed / (worksheet.rowCount - 1)) * 100).toFixed(1)}%`)
  
  // Verify final count
  const finalCount = await prisma.voter.count()
  console.log(`\n📊 Final voter count in database: ${finalCount}`)
  
  if (processed === worksheet.rowCount - 1) {
    console.log('✅ All rows from Master Data sheet uploaded successfully!')
  } else {
    console.log(`⚠️  Warning: Expected ${worksheet.rowCount - 1} voters, but processed ${processed}`)
  }
}

async function main() {
  const filePath = process.argv[2] || DEFAULT_FILE
  await uploadFinalData(filePath)
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('\n✅ Script completed successfully!')
  })
  .catch(async (error) => {
    await prisma.$disconnect()
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })


