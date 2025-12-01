import { PrismaClient } from '@prisma/client'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createRequire } from 'module'

const prisma = new PrismaClient()

// Handle pdf-parse import (CommonJS module)
const require = createRequire(import.meta.url)
const pdfParseModule = require('pdf-parse')
// pdf-parse exports the function directly
const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule.default || pdfParseModule)

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

// Map PDF filename to zone codes
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
  
  if (lowerFilename.includes('kutch')) {
    return {
      region: 'Kutch',
      yuvaPank: 'KUTCH',
      karobari: 'KUTCH',
      trustee: 'KUTCH'
    }
  }
  
  if (lowerFilename.includes('bhuj')) {
    return {
      region: 'Bhuj',
      yuvaPank: 'BHUJ_ANJAR',
      karobari: 'BHUJ',
      trustee: 'BHUJ'
    }
  }
  
  if (lowerFilename.includes('anjar')) {
    return {
      region: 'Anjar',
      yuvaPank: 'BHUJ_ANJAR',
      karobari: 'ANJAR',
      trustee: 'ANJAR_ANYA_GUJARAT'
    }
  }
  
  if (lowerFilename.includes('anya') || lowerFilename.includes('gujarat')) {
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
async function findZonesForRegion(region: string, age: number, zoneMapping: { yuvaPank: string; karobari: string; trustee: string }) {
  const zones: {
    yuvaPankZone: string | null
    karobariZone: string | null
    trusteeZone: string | null
  } = {
    yuvaPankZone: null,
    karobariZone: null,
    trusteeZone: null
  }

  // Find Yuva Pankh zone (only if age is between 18-39)
  if (age >= 18 && age <= 39) {
    // Only allow Karnataka & Goa and Raigad for Yuva Pankh
    const allowedYuvaPankCodes = ['KARNATAKA_GOA', 'RAIGAD']
    const yuvaPankCode = allowedYuvaPankCodes.includes(zoneMapping.yuvaPank) ? zoneMapping.yuvaPank : null
    
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

  // Find Karobari zone (age 18+)
  if (age >= 18) {
    const karobariZone = await prisma.zone.findFirst({
      where: {
        code: zoneMapping.karobari,
        electionType: 'KAROBARI_MEMBERS'
      }
    })
    zones.karobariZone = karobariZone?.id || null
  }

  // Find Trustee zone (age 18+)
  if (age >= 18) {
    const trusteeZone = await prisma.zone.findFirst({
      where: {
        code: zoneMapping.trustee,
        electionType: 'TRUSTEES'
      }
    })
    zones.trusteeZone = trusteeZone?.id || null
  }

  return zones
}

// Parse voter data from PDF text
function parseVotersFromText(text: string): any[] {
  const voters: any[] = []
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // Try multiple parsing strategies
  // Strategy 1: Tabular format (columns separated by spaces/tabs)
  // Strategy 2: Line-by-line format (each voter on one or multiple lines)
  // Strategy 3: Pattern matching for common formats
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip header lines
    if (line.match(/^(sr|s\.?no|sl\.?no|serial|name|phone|mobile|dob|date|gender|age|address)/i)) {
      continue
    }
    
    // Skip page numbers and footers
    if (line.match(/^(page|\d+\s*$)/i)) {
      continue
    }
    
    // Strategy 1: Tabular format - split by multiple spaces or tabs
    const columns = line.split(/\s{2,}|\t+/).filter(col => col.trim().length > 0)
    
    if (columns.length >= 3) {
      // Try to identify columns
      let name = ''
      let phone: string | null = null
      let dob = ''
      let gender = 'M'
      let age: number | undefined = undefined
      
      // Find phone (10 digits)
      const phoneCol = columns.find(col => /\d{10}/.test(col))
      if (phoneCol) {
        phone = normalizePhone(phoneCol)
      }
      
      // Find DOB (DD/MM/YYYY or DD-MM-YYYY)
      const dobCol = columns.find(col => /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(col))
      if (dobCol) {
        dob = dobCol.replace(/-/g, '/')
        const calculatedAge = calculateAge(dob)
        age = calculatedAge ?? undefined
      }
      
      // Find age if DOB not found
      if (!age) {
        const ageCol = columns.find(col => /^\d{2}$/.test(col) && parseInt(col) >= 18 && parseInt(col) <= 100)
        if (ageCol) {
          age = parseInt(ageCol)
        }
      }
      
      // Find gender
      const genderCol = columns.find(col => /^(M|F|Male|Female|MALE|FEMALE)$/i.test(col))
      if (genderCol) {
        gender = genderCol.toUpperCase().charAt(0)
      }
      
      // Name is usually the first column or the one without numbers
      name = columns.find(col => 
        !/\d{10}/.test(col) && 
        !/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(col) &&
        !/^(M|F|Male|Female)$/i.test(col) &&
        col.length > 2
      ) || columns[0] || ''
      
      // Clean name
      name = name.replace(/^(mr|mrs|miss|dr|prof|shri|shrimati)\s+/i, '').trim()
      
      if (name && phone && (dob || age)) {
        voters.push({
          name: name,
          phone: phone,
          dob: dob || (age ? `01/01/${new Date().getFullYear() - age}` : ''),
          gender: gender,
          age: age || (dob ? calculateAge(dob) : undefined)
        })
        continue
      }
    }
    
    // Strategy 2: Pattern matching for inline data
    // Pattern: Name followed by phone and DOB
    const inlinePattern = line.match(/([A-Za-z\s]{3,}?)\s+(\d{10})\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)
    if (inlinePattern) {
      const name = inlinePattern[1].trim()
      const phone = normalizePhone(inlinePattern[2])
      const dob = inlinePattern[3].replace(/-/g, '/')
      
      if (name && phone && dob) {
        voters.push({
          name: name,
          phone: phone,
          dob: dob,
          gender: 'M',
          age: calculateAge(dob)
        })
        continue
      }
    }
    
    // Strategy 3: Multi-line format - combine current line with next few lines
    if (i < lines.length - 2) {
      const combined = [line, lines[i + 1], lines[i + 2]].join(' ')
      
      const phoneMatch = combined.match(/(\d{10})/)
      const dobMatch = combined.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/)
      
      if (phoneMatch && dobMatch) {
        const phone = normalizePhone(phoneMatch[1])
        const dob = dobMatch[1].replace(/-/g, '/')
        
        // Extract name (text before phone)
        const nameMatch = combined.substring(0, combined.indexOf(phoneMatch[1])).trim()
        const name = nameMatch.split(/\s+/).filter(part => 
          part.length > 2 && 
          !part.match(/^\d+$/) && 
          !part.match(/^(mr|mrs|miss|dr|prof)/i)
        ).join(' ')
        
        if (name && phone && dob) {
          voters.push({
            name: name,
            phone: phone,
            dob: dob,
            gender: 'M',
            age: calculateAge(dob)
          })
          i += 2 // Skip next 2 lines as they're part of this voter
          continue
        }
      }
    }
  }
  
  // Remove duplicates based on phone number
  const uniqueVoters = voters.filter((voter, index, self) =>
    index === self.findIndex(v => v.phone === voter.phone)
  )
  
  return uniqueVoters
}

async function uploadVotersFromPDF(filePath: string) {
  try {
    console.log(`Reading PDF file: ${filePath}`)
    
    // pdf-parse - try different approaches based on version
    const pdfParseModule = require('pdf-parse')
    
    const dataBuffer = readFileSync(filePath)
    // Convert Buffer to Uint8Array as required by pdf-parse
    const uint8Array = new Uint8Array(dataBuffer)
    let data: any
    
    // Try approach 1: Direct function call (standard pdf-parse)
    if (typeof pdfParseModule === 'function') {
      data = await pdfParseModule(uint8Array)
    }
    // Try approach 2: Using PDFParse class with getText
    else if (pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse(uint8Array)
      await parser.load()
      const textResult = await parser.getText() // getText returns a Promise
      // getText might return an object or array, extract the actual text
      const text = typeof textResult === 'string' ? textResult : 
                   (textResult?.text || (Array.isArray(textResult) ? textResult.join('\n') : String(textResult)))
      const numpages = parser.pages?.length || parser.numPages || 1
      data = { text, numpages }
    }
    // Try approach 3: Module might export a default function
    else if (pdfParseModule.default && typeof pdfParseModule.default === 'function') {
      data = await pdfParseModule.default(dataBuffer)
    }
    else {
      throw new Error('Unable to parse PDF - pdf-parse module structure not recognized. Please convert PDFs to Excel format.')
    }
    
    console.log(`PDF extracted ${data.numpages} pages`)
    console.log(`Text length: ${data.text.length} characters`)
    
    // Get zone mapping from filename
    const filename = filePath.split(/[\\/]/).pop() || ''
    const zoneMapping = getZoneMappingFromFilename(filename)
    console.log(`\nDetected zone mapping:`, zoneMapping)
    
    // Parse voters from text - ensure text is a string
    const text = data.text || ''
    if (!text || typeof text !== 'string') {
      throw new Error('Unable to extract text from PDF. The PDF might be image-based or corrupted.')
    }
    const voters = parseVotersFromText(text)
    
    console.log(`\nFound ${voters.length} potential voters in PDF`)
    
    // Validate and process voters
    const validVoters: any[] = []
    const invalidVoters: string[] = []
    
    for (let i = 0; i < voters.length; i++) {
      const voter = voters[i]
      
      // Normalize phone
      const phone = normalizePhone(voter.phone)
      if (!phone) {
        invalidVoters.push(`Voter ${i + 1}: Invalid phone number - ${voter.phone}`)
        continue
      }
      
      // Validate DOB and calculate age
      let age: number | null = null
      if (voter.dob) {
        age = calculateAge(voter.dob)
        if (!age || age < 18) {
          invalidVoters.push(`Voter ${i + 1}: Invalid age (${age || 'N/A'}) - must be 18+`)
          continue
        }
      } else if (voter.age) {
        const ageFromField = parseInt(voter.age.toString())
        if (!isNaN(ageFromField) && ageFromField >= 18) {
          age = ageFromField
          // Estimate DOB
          const currentYear = new Date().getFullYear()
          const birthYear = currentYear - age
          voter.dob = `01/01/${birthYear}`
        } else {
          invalidVoters.push(`Voter ${i + 1}: Invalid age (${voter.age}) - must be 18+`)
          continue
        }
      } else {
        invalidVoters.push(`Voter ${i + 1}: Missing date of birth or age`)
        continue
      }
      
      // Set defaults
      voter.phone = phone
      voter.gender = voter.gender?.toUpperCase() || 'M'
      voter.region = zoneMapping.region
      voter.mulgam = voter.mulgam || zoneMapping.region
      
      validVoters.push(voter)
    }
    
    console.log(`\nValid voters: ${validVoters.length}`)
    console.log(`Invalid voters: ${invalidVoters.length}`)
    
    if (invalidVoters.length > 0) {
      console.log('\nInvalid voter details:')
      invalidVoters.slice(0, 20).forEach(err => console.log(`  - ${err}`))
      if (invalidVoters.length > 20) {
        console.log(`  ... and ${invalidVoters.length - 20} more`)
      }
    }
    
    if (validVoters.length === 0) {
      console.log('\nNo valid voters to upload!')
      return
    }
    
    // Upload voters
    console.log(`\n📤 Uploading ${validVoters.length} voters...`)
    
    let successCount = 0
    let errorCount = 0
    let duplicateCount = 0
    
    for (const voter of validVoters) {
      try {
        const age = calculateAge(voter.dob) || voter.age || 18
        const electionZones = await findZonesForRegion(zoneMapping.region, age, zoneMapping)
        
        // Get primary zone for backward compatibility
        const primaryZoneId = electionZones.yuvaPankZone || electionZones.karobariZone || electionZones.trusteeZone
        if (!primaryZoneId) {
          console.log(`  ⚠️  Skipping ${voter.name}: No zones available`)
          errorCount++
          continue
        }
        
        const primaryZone = await prisma.zone.findUnique({
          where: { id: primaryZoneId }
        })
        
        // Check if user already exists (phone is not unique, so use findFirst)
        const existingUser = await prisma.user.findFirst({
          where: { 
            phone: voter.phone,
            name: voter.name
          }
        })
        
        if (existingUser) {
          duplicateCount++
          continue
        }
        
        // Create User account
        // Parse date of birth safely
        let dateOfBirth: Date | null = null
        if (voter.dob) {
          try {
            const [day, month, year] = voter.dob.split('/').map(Number)
            if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900 && year <= new Date().getFullYear()) {
              dateOfBirth = new Date(year, month - 1, day)
              // Validate the date
              if (isNaN(dateOfBirth.getTime())) {
                dateOfBirth = null
              }
            }
          } catch (e) {
            // Invalid date, will be null
            dateOfBirth = null
          }
        }
        
        const user = await prisma.user.create({
          data: {
            phone: voter.phone,
            name: voter.name,
            email: voter.email || `${voter.phone}@voter.kms-election.com`,
            dateOfBirth: dateOfBirth,
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
            dob: voter.dob || null,
            gender: voter.gender || null,
            mulgam: voter.mulgam || null,
            region: primaryZone?.name || zoneMapping.region,
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
          duplicateCount++
        } else {
          console.log(`  ✗ Error uploading ${voter.name}: ${error.message}`)
          errorCount++
        }
      }
    }
    
    console.log(`\n✅ Upload complete!`)
    console.log(`   Success: ${successCount}`)
    console.log(`   Errors: ${errorCount}`)
    console.log(`   Duplicates skipped: ${duplicateCount}`)
    console.log(`   (These voters already exist in the database)`)
    
  } catch (error: any) {
    console.error('Error processing PDF file:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Main execution - process all PDF files
const pdfFiles = [
  'Karnataka - Voter List.pdf',
  'Raigad - Voter List.pdf',
  'Bhuj - Voter List.pdf',
  'Mumbai - Voter List.pdf',
  // Add more files as needed
]

async function processAllPDFs() {
  const filesToProcess = process.argv.slice(2)
  let files = filesToProcess.length > 0 ? filesToProcess : pdfFiles
  
  // Filter to only existing files
  files = files.filter(file => existsSync(file))
  
  if (files.length === 0) {
    console.log('\n❌ No PDF files found!')
    console.log('Please provide PDF file paths as arguments:')
    console.log('  npm run upload:voters:pdf "Karnataka - Voter List.pdf" "Raigad - Voter List.pdf"')
    process.exit(1)
  }
  
  console.log(`\n🚀 Processing ${files.length} PDF file(s)...\n`)
  
  for (const file of files) {
    try {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Processing: ${file}`)
      console.log(`${'='.repeat(60)}`)
      await uploadVotersFromPDF(file)
    } catch (error: any) {
      console.error(`\n❌ Failed to process ${file}:`, error.message)
      console.error(error.stack)
    }
  }
  
  console.log(`\n✅ All PDFs processed!`)
}

processAllPDFs()
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

