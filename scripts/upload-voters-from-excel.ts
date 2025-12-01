import ExcelJS from 'exceljs'
import { PrismaClient } from '@prisma/client'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

// Helper function to calculate age from DOB
function calculateAge(dob: string): number | null {
  if (!dob) return null
  
  // Handle DD/MM/YYYY format
  const parts = dob.toString().split('/')
  if (parts.length !== 3) return null
  
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const year = parseInt(parts[2], 10)
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  
  const birthDate = new Date(year, month, day)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

// Helper function to normalize phone number
function normalizePhone(phone: any): string | null {
  if (!phone) return null
  const phoneStr = phone.toString().replace(/\D/g, '') // Remove non-digits
  return phoneStr.length === 10 ? phoneStr : null
}

// Map filename to zone mapping
function getZoneMappingFromFilename(filename: string): { region: string; yuvaPank: string; karobari: string; trustee: string } {
  const lowerFilename = filename.toLowerCase()
  
  if (lowerFilename.includes('karnataka')) {
    return {
      region: 'Karnataka & Goa',
      yuvaPank: 'KARNATAKA_GOA',
      karobari: 'KARNATAKA_GOA',
      trustee: 'KARNATAKA_GOA'
    }
  }
  
  if (lowerFilename.includes('raigad')) {
    return {
      region: 'Raigad',
      yuvaPank: 'RAIGAD',
      karobari: 'RAIGAD',
      trustee: 'RAIGAD'
    }
  }
  
  if (lowerFilename.includes('mumbai')) {
    return {
      region: 'Mumbai',
      yuvaPank: 'MUMBAI',
      karobari: 'MUMBAI',
      trustee: 'MUMBAI'
    }
  }
  
  if (lowerFilename.includes('gujarat') || lowerFilename.includes('bhuj') || lowerFilename.includes('kutch')) {
    // Default to Anya Gujarat for general Gujarat files
    if (lowerFilename.includes('bhuj')) {
      return {
        region: 'Bhuj',
        yuvaPank: 'BHUJ_ANJAR',
        karobari: 'BHUJ',
        trustee: 'BHUJ'
      }
    }
    if (lowerFilename.includes('kutch')) {
      return {
        region: 'Kutch',
        yuvaPank: 'KUTCH',
        karobari: 'KUTCH',
        trustee: 'KUTCH'
      }
    }
    return {
      region: 'Anya Gujarat',
      yuvaPank: 'ANYA_GUJARAT',
      karobari: 'ANYA_GUJARAT',
      trustee: 'ANJAR_ANYA_GUJARAT'
    }
  }
  
  // Default to Mumbai
  return {
    region: 'Mumbai',
    yuvaPank: 'MUMBAI',
    karobari: 'MUMBAI',
    trustee: 'MUMBAI'
  }
}

// Helper function to find zones for region
async function findZonesForRegion(region: string, age: number, zoneMapping?: { yuvaPank: string; karobari: string; trustee: string }) {
  const zones: {
    yuvaPankZone: string | null
    karobariZone: string | null
    trusteeZone: string | null
  } = {
    yuvaPankZone: null,
    karobariZone: null,
    trusteeZone: null
  }

  // Use provided zone mapping or fall back to region-based mapping
  let mapping: { yuvaPank: string; karobari: string; trustee: string }
  
  if (zoneMapping) {
    mapping = zoneMapping
  } else {
    // Map region to zone codes
    const regionZoneMapping: any = {
      'Mumbai': { yuvaPank: 'MUMBAI', karobari: 'MUMBAI', trustee: 'MUMBAI' },
      'Raigad': { yuvaPank: 'RAIGAD', karobari: 'RAIGAD', trustee: 'RAIGAD' },
      'Karnataka & Goa': { yuvaPank: 'KARNATAKA_GOA', karobari: 'KARNATAKA_GOA', trustee: 'KARNATAKA_GOA' },
      'Kutch': { yuvaPank: 'KUTCH', karobari: 'KUTCH', trustee: 'KUTCH' },
      'Bhuj': { yuvaPank: 'BHUJ_ANJAR', karobari: 'BHUJ', trustee: 'BHUJ' },
      'Anjar': { yuvaPank: 'BHUJ_ANJAR', karobari: 'ANJAR', trustee: 'ANJAR_ANYA_GUJARAT' },
      'Abdasa': { yuvaPank: 'KUTCH', karobari: 'ABDASA', trustee: 'ABDASA_GARDA' },
      'Garda': { yuvaPank: 'KUTCH', karobari: 'GARADA', trustee: 'ABDASA_GARDA' },
      'Anya Gujarat': { yuvaPank: 'ANYA_GUJARAT', karobari: 'ANYA_GUJARAT', trustee: 'ANJAR_ANYA_GUJARAT' },
      'Panvel': { yuvaPank: 'MUMBAI', karobari: 'MUMBAI', trustee: 'MUMBAI' }
    }
    mapping = regionZoneMapping[region] || regionZoneMapping['Mumbai']
  }

  // Find Yuva Pankh zone (only if age is between 18-39)
  if (age >= 18 && age <= 39) {
    // Only allow Karnataka & Goa and Raigad for Yuva Pankh
    const allowedYuvaPankCodes = ['KARNATAKA_GOA', 'RAIGAD']
    const yuvaPankCode = allowedYuvaPankCodes.includes(mapping.yuvaPank) ? mapping.yuvaPank : null
    
    if (yuvaPankCode) {
      const yuvaPankZone = await prisma.zone.findFirst({
        where: {
          code: yuvaPankCode,
          electionType: 'YUVA_PANK'
        }
      })
      zones.yuvaPankZone = yuvaPankZone?.id || null
    }
  }

  // Find Trustee zone (age 18+)
  if (age >= 18) {
    const trusteeZone = await prisma.zone.findFirst({
      where: {
        code: mapping.trustee,
        electionType: 'TRUSTEES'
      }
    })
    zones.trusteeZone = trusteeZone?.id || null
  }

  return zones
}

async function uploadVotersFromExcel(filePath: string) {
  try {
    console.log(`Reading Excel file: ${filePath}`)
    
    // Get zone mapping from filename
    const filename = filePath.split(/[\\/]/).pop() || ''
    const zoneMapping = getZoneMappingFromFilename(filename)
    console.log(`\nDetected zone mapping from filename:`, zoneMapping)
    
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)
    
    // Try to get first worksheet by index or name
    let worksheet = workbook.getWorksheet(1)
    if (!worksheet) {
      // Try to get by name
      worksheet = workbook.worksheets[0]
    }
    if (!worksheet) {
      throw new Error(`No worksheet found in Excel file. Available worksheets: ${workbook.worksheets.map(ws => ws.name).join(', ')}`)
    }

    console.log(`Found worksheet: ${worksheet.name}`)
    
    // Get headers from first row
    const headerRow = worksheet.getRow(1)
    const headers: string[] = []
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString().trim() || ''
    })

    console.log('Headers found:', headers)

    // Map common column names to our field names
    const columnMapping: { [key: string]: string } = {
      'name': 'name',
      'full name': 'name',
      'voter name': 'name',
      'phone': 'phone',
      'mobile': 'phone',
      'phone number': 'phone',
      'mobile number': 'phone',
      'dob': 'dob',
      'date of birth': 'dob',
      'birthdate': 'dob',
      'birth date': 'dob',
      'gender': 'gender',
      'sex': 'gender',
      'email': 'email',
      'email address': 'email',
      'mulgam': 'mulgam',
      'city': 'mulgam',
      'current city': 'mulgam',
      'region': 'region',
      'zone': 'region',
      'voter id': 'voterId',
      'id': 'voterId'
    }

    // Create mapping from headers to field names
    const fieldMapping: { [key: number]: string } = {}
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim()
      for (const [key, value] of Object.entries(columnMapping)) {
        if (normalizedHeader.includes(key)) {
          fieldMapping[index] = value
          break
        }
      }
      // Also map AGE column if present
      if (normalizedHeader === 'age') {
        fieldMapping[index] = 'age'
      }
    })

    console.log('Field mapping:', fieldMapping)

    // Read data rows
    const voters: any[] = []
    const errors: string[] = []

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // Skip header row

      const voterData: any = {}
      
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const fieldName = fieldMapping[colNumber - 1]
        if (fieldName) {
          // Handle different cell value types
          let value = cell.value
          if (value === null || value === undefined) {
            value = ''
          } else if (typeof value === 'object' && 'text' in value) {
            value = (value as any).text
          } else if (value instanceof Date) {
            value = value.toLocaleDateString('en-GB') // DD/MM/YYYY format
          }
          voterData[fieldName] = value?.toString().trim() || ''
        }
      })

      // Skip rows that look like section headers (city names in phone field, no name)
      const phone = voterData.phone?.toString().toUpperCase() || ''
      const isSectionHeader = !voterData.name && (
        phone === 'CHIPLUN' || phone === 'KALAMBOLI' || phone === 'KAMOTHE' || 
        phone === 'KHARGHAR' || phone === 'KHOPOLI' || phone === 'KOLHAPUR' ||
        phone === 'NEW PANVEL' || phone === 'PANVEL' || phone === 'PEN' ||
        phone === 'PUNE' || phone === 'SANGLI' || phone === 'SATARA' ||
        phone === 'URAN' || phone === 'VADKHAL' || phone === 'INTERNATIONAL' ||
        phone.includes('PANVEL') || phone.length < 10 && phone.length > 0
      )

      if (isSectionHeader) {
        return // Skip section headers
      }

      // Only process rows with at least name and phone
      if (voterData.name && voterData.phone) {
        voters.push(voterData)
      } else if (Object.keys(voterData).length > 0 && !isSectionHeader) {
        errors.push(`Row ${rowNumber}: Missing required fields (name or phone)`)
      }
    })

    console.log(`\nFound ${voters.length} voters to process`)
    if (errors.length > 0) {
      console.log(`\n${errors.length} rows with errors:`)
      errors.forEach(err => console.log(`  - ${err}`))
    }

    // Process and validate voters
    const validVoters: any[] = []
    const invalidVoters: string[] = []

    for (let i = 0; i < voters.length; i++) {
      const voter = voters[i]
      const rowNum = i + 2 // +2 because we skip header and arrays are 0-indexed

      // Normalize phone
      const phone = normalizePhone(voter.phone)
      if (!phone) {
        invalidVoters.push(`Row ${rowNum}: Invalid phone number - ${voter.phone}`)
        continue
      }

      // Validate DOB format and calculate age
      let age: number | null = null
      if (voter.dob) {
        // Try to parse date - handle Excel date serial numbers
        let dobStr = voter.dob.toString()
        
        // If it's an Excel date serial number (like 45234)
        if (!isNaN(Number(dobStr)) && Number(dobStr) > 25569) {
          const excelDate = new Date((Number(dobStr) - 25569) * 86400 * 1000)
          dobStr = `${excelDate.getDate().toString().padStart(2, '0')}/${(excelDate.getMonth() + 1).toString().padStart(2, '0')}/${excelDate.getFullYear()}`
        }
        
        // Try to parse as Date object if it's already a date
        if (dobStr instanceof Date || (typeof dobStr === 'string' && dobStr.includes('T'))) {
          const dateObj = new Date(dobStr)
          if (!isNaN(dateObj.getTime())) {
            dobStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`
          }
        }
        
        age = calculateAge(dobStr)
        if (!age || age < 18) {
          invalidVoters.push(`Row ${rowNum}: Invalid age (${age || 'N/A'}) - must be 18+`)
          continue
        }
        voter.dob = dobStr
      } else if (voter.age) {
        // Try to use AGE column if DOB is not available
        const ageFromColumn = parseInt(voter.age.toString())
        if (!isNaN(ageFromColumn) && ageFromColumn >= 18) {
          age = ageFromColumn
          // Estimate DOB (approximate)
          const currentYear = new Date().getFullYear()
          const birthYear = currentYear - age
          voter.dob = `01/01/${birthYear}` // Approximate DOB
        } else {
          invalidVoters.push(`Row ${rowNum}: Invalid age from AGE column (${voter.age}) - must be 18+`)
          continue
        }
      } else {
        invalidVoters.push(`Row ${rowNum}: Missing date of birth`)
        continue
      }

      // Set defaults - use zone mapping from filename if region not specified
      voter.phone = phone
      voter.gender = voter.gender?.toUpperCase() || 'M'
      voter.region = voter.region || voter.mulgam || zoneMapping.region
      voter.mulgam = voter.mulgam || voter.region || zoneMapping.region

      validVoters.push(voter)
    }

    console.log(`\nValid voters: ${validVoters.length}`)
    console.log(`Invalid voters: ${invalidVoters.length}`)
    
    if (invalidVoters.length > 0) {
      console.log('\nInvalid voter details:')
      invalidVoters.forEach(err => console.log(`  - ${err}`))
    }

    if (validVoters.length === 0) {
      console.log('\nNo valid voters to upload!')
      return
    }

    // Upload all valid voters - let database handle duplicates via unique constraints
    // We'll catch and report any constraint violations during upload
    const votersToUpload = validVoters
    let duplicates: any[] = []

    console.log(`\n📤 Uploading ${votersToUpload.length} voters...`)

    // Upload voters
    let successCount = 0
    let errorCount = 0

    for (const voter of votersToUpload) {
      try {
        const age = calculateAge(voter.dob)!
        const region = voter.region || zoneMapping.region
        const electionZones = await findZonesForRegion(region, age, zoneMapping)

        // Get primary zone for backward compatibility
        const primaryZoneId = electionZones.yuvaPankZone || electionZones.trusteeZone
        if (!primaryZoneId) {
          console.log(`  ⚠️  Skipping ${voter.name}: No zones available`)
          errorCount++
          continue
        }

        const primaryZone = await prisma.zone.findUnique({
          where: { id: primaryZoneId }
        })

        // Create User account
        const user = await prisma.user.create({
          data: {
            phone: voter.phone,
            name: voter.name,
            email: voter.email || `${voter.phone}@voter.kms-election.com`,
            dateOfBirth: (() => {
              const [day, month, year] = voter.dob.split('/').map(Number)
              return new Date(year, month - 1, day)
            })(),
            age: age,
            role: 'VOTER'
          }
        })

        // Generate voter ID
        const voterId = voter.voterId || `V${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 2).toUpperCase()}`

        // Create Voter profile
        await prisma.voter.create({
          data: {
            userId: user.id,
            voterId,
            name: voter.name,
            email: voter.email || null,
            phone: voter.phone,
            age: age,
            dob: voter.dob,
            gender: voter.gender || null,
            mulgam: voter.mulgam || null,
            region: primaryZone?.name || region,
            zoneId: primaryZone?.id,
            yuvaPankZoneId: electionZones.yuvaPankZone,
            karobariZoneId: electionZones.karobariZone,
            trusteeZoneId: electionZones.trusteeZone,
            hasVoted: false,
            isActive: true
          }
        })

        successCount++
        if (successCount % 10 === 0) {
          console.log(`  ✓ Processed ${successCount} voters...`)
        }
      } catch (error: any) {
        // Check if it's a duplicate/unique constraint error
        if (error.code === 'P2002' || error.message?.includes('Unique constraint') || error.message?.includes('duplicate')) {
          duplicates.push(voter)
          // Don't log duplicates as errors, just track them
        } else {
          console.log(`  ✗ Error uploading ${voter.name}: ${error.message}`)
          errorCount++
        }
      }
    }

    console.log(`\n✅ Upload complete!`)
    console.log(`   Success: ${successCount}`)
    console.log(`   Errors: ${errorCount}`)
    if (duplicates.length > 0) {
      console.log(`   Duplicates skipped: ${duplicates.length}`)
      console.log(`   (These voters already exist in the database)`)
    }

  } catch (error: any) {
    console.error('Error processing Excel file:', error)
    throw error
  }
}

// Batch processing function
async function processAllExcelFiles() {
  const filesToProcess = process.argv.slice(2)
  
  // Default files if none provided
  const defaultFiles = [
    'Karnataka - Voter List.xlsx',
    'Gujarat - Voter List.xlsx',
    'Raigad - Voter List.xlsx',
    'Mumbai - Voter List.xlsx'
  ]
  
  const files = filesToProcess.length > 0 ? filesToProcess : defaultFiles
  
  // Filter to only existing files
  const existingFiles = files.filter(file => existsSync(file))
  
  if (existingFiles.length === 0) {
    console.log('\n❌ No Excel files found!')
    console.log('Please provide Excel file paths as arguments:')
    console.log('  npm run upload:voters "Karnataka - Voter List.xlsx" "Raigad - Voter List.xlsx"')
    process.exit(1)
  }
  
  console.log(`\n🚀 Processing ${existingFiles.length} Excel file(s)...\n`)
  
  for (const file of existingFiles) {
    try {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Processing: ${file}`)
      console.log(`${'='.repeat(60)}`)
      await uploadVotersFromExcel(file)
    } catch (error: any) {
      console.error(`\n❌ Failed to process ${file}:`, error.message)
      console.error(error.stack)
    }
  }
  
  console.log(`\n✅ All Excel files processed!`)
}

// Main execution
processAllExcelFiles()
  .then(async () => {
    await prisma.$disconnect()
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch(async (error) => {
    await prisma.$disconnect()
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

