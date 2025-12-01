import ExcelJS from 'exceljs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_FILE = 'Final Data for Input.xlsx'

// Same mappings as upload script
const REGION_MAPPINGS: Record<string, { karobari: string; trustee: string; yuvaPank: string | null }> = {
  Mumbai: { karobari: 'MUMBAI', trustee: 'MUMBAI', yuvaPank: null },
  Raigad: { karobari: 'RAIGAD', trustee: 'RAIGAD', yuvaPank: 'RAIGAD' },
  'Karnataka & Goa': { karobari: 'KARNATAKA_GOA', trustee: 'KARNATAKA_GOA', yuvaPank: 'KARNATAKA_GOA' },
  Bhuj: { karobari: 'BHUJ', trustee: 'BHUJ', yuvaPank: null },
  Kutch: { karobari: 'KUTCH', trustee: 'ABDASA_GARDA', yuvaPank: null },
  Anjar: { karobari: 'ANJAR', trustee: 'ANJAR_ANYA_GUJARAT', yuvaPank: null },
  'Anya Gujarat': { karobari: 'ANYA_GUJARAT', trustee: 'ANJAR_ANYA_GUJARAT', yuvaPank: null },
}

const REGION_ALIAS: Record<string, string> = {
  'Karnataka-Goa': 'Karnataka & Goa',
}

const ANJAR_CITIES = new Set(
  ['anjar', 'adipur', 'mandvi', 'mundra', 'gandhidham', 'gandhi dham', 'shenoi', 'shinoi', 'bhandariya', 'bhadreshwar', 'khedoi', 'rapar', 'varsamedi'].map((city) => city.toLowerCase())
)

function normalizePhone(value: any): string | null {
  if (value === null || value === undefined) return null
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

function normalizeRegion(region: string | null, city: string | null): { karobari: string; trustee: string; yuvaPank: string | null; label: string } {
  const trimmedRegion = region?.trim() || ''
  const normalized = REGION_ALIAS[trimmedRegion] || trimmedRegion

  if (normalized === 'Anjar-Anya Gujarat') {
    const cityName = city?.trim().toLowerCase() || ''
    if (ANJAR_CITIES.has(cityName)) {
      return { ...REGION_MAPPINGS['Anjar'], label: 'Anjar' }
    }
    return { ...REGION_MAPPINGS['Anya Gujarat'], label: 'Anya Gujarat' }
  }

  const mapping = REGION_MAPPINGS[normalized] || REGION_MAPPINGS['Mumbai']
  return { ...mapping, label: normalized || 'Mumbai' }
}

async function findZoneId(code: string, electionType: string): Promise<string | null> {
  const zone = await prisma.zone.findFirst({
    where: { code, electionType },
    select: { id: true },
  })
  return zone?.id || null
}

async function fixVoterZonesFromExcel(filePath: string) {
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

  console.log(`\n📊 Processing ${worksheet.rowCount - 1} rows from Excel...\n`)

  let fixed = 0
  let notFound = 0
  let alreadyCorrect = 0
  let errors = 0
  const issues: Array<{ phone: string; name: string; expected: string; actual: string }> = []

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const rowValues = Array.isArray(row.values) ? row.values : Object.values(row.values || {})
    if (rowValues.every((value: any) => value === null || value === undefined || value === '')) {
      continue
    }

    try {
      const phone = normalizePhone(getCellValue(row, 6))
      if (!phone) continue

      const name = (getCellValue(row, 3) ?? '').toString().trim()
      const region = (getCellValue(row, 10) ?? '').toString().trim()
      const city = (getCellValue(row, 8) ?? '').toString().trim() || null
      const ageCell = getCellValue(row, 5)
      const age = ageCell ? Number(ageCell) : null

      if (!name || !region) continue

      const regionMapping = normalizeRegion(region, city)
      
      // Find voter by phone
      const voter = await prisma.voter.findFirst({
        where: { phone },
        include: {
          karobariZone: true,
          trusteeZone: true,
          yuvaPankZone: true,
        },
      })

      if (!voter) {
        notFound++
        if (notFound <= 10) {
          console.log(`⚠️  Voter not found: ${name} (${phone})`)
        }
        continue
      }

      // Get correct zone IDs
      const correctKarobariZoneId = await findZoneId(regionMapping.karobari, 'KAROBARI_MEMBERS')
      const correctTrusteeZoneId = await findZoneId(regionMapping.trustee, 'TRUSTEES')
      const correctYuvaPankZoneId =
        age && age >= 18 && age <= 39 && regionMapping.yuvaPank
          ? await findZoneId(regionMapping.yuvaPank, 'YUVA_PANK')
          : null

      // Check if zones need fixing
      const karobariNeedsFix = voter.karobariZoneId !== correctKarobariZoneId
      const trusteeNeedsFix = voter.trusteeZoneId !== correctTrusteeZoneId
      const yuvaPankNeedsFix = voter.yuvaPankZoneId !== correctYuvaPankZoneId

      if (!karobariNeedsFix && !trusteeNeedsFix && !yuvaPankNeedsFix) {
        alreadyCorrect++
        continue
      }

      // Fix zones
      await prisma.voter.update({
        where: { id: voter.id },
        data: {
          karobariZoneId: correctKarobariZoneId,
          trusteeZoneId: correctTrusteeZoneId,
          yuvaPankZoneId: correctYuvaPankZoneId,
          region: regionMapping.label,
        },
      })

      if (karobariNeedsFix) {
        issues.push({
          phone,
          name,
          expected: regionMapping.karobari,
          actual: voter.karobariZone?.code || 'NONE',
        })
      }

      fixed++
      if (fixed % 100 === 0) {
        console.log(`  ✓ Fixed ${fixed} voters...`)
      }
    } catch (error: any) {
      errors++
      if (errors <= 10) {
        console.error(`  ✗ Row ${rowNumber}: ${error.message}`)
      }
    }
  }

  console.log('\n✅ Zone Fix Summary:')
  console.log(`   Fixed: ${fixed}`)
  console.log(`   Already correct: ${alreadyCorrect}`)
  console.log(`   Not found: ${notFound}`)
  console.log(`   Errors: ${errors}`)

  if (issues.length > 0) {
    console.log(`\n⚠️  ${issues.length} voters had incorrect Karobari zones:`)
    issues.slice(0, 20).forEach((issue) => {
      console.log(`   ${issue.name} (${issue.phone}): ${issue.actual} → ${issue.expected}`)
    })
    if (issues.length > 20) {
      console.log(`   ... and ${issues.length - 20} more`)
    }
  }
}

async function main() {
  const filePath = process.argv[2] || DEFAULT_FILE
  await fixVoterZonesFromExcel(filePath)
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

