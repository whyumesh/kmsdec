import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

// Load environment variables
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

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = i < line.length - 1 ? line[i + 1] : ''
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

async function diagnose() {
  const filePath = 'Final Date for Input 2.0.csv'
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const lines = fileContent.split('\n').filter(line => line.trim() !== '')
  
  const header = parseCSVLine(lines[0])
  const colVoterId = header.findIndex(col => col.toLowerCase().includes('vid'))
  const colName = header.findIndex(col => col.toLowerCase().includes('name'))
  const colDob = header.findIndex(col => col.toLowerCase().includes('dob'))
  const colAge = header.findIndex(col => col.toLowerCase().includes('age'))
  const colRegion = header.findIndex(col => col.toLowerCase().includes('voting region'))
  const colCity = header.findIndex(col => col.toLowerCase().includes('city'))
  
  console.log(`\n📊 Analyzing CSV file...`)
  console.log(`Total rows: ${lines.length - 1}`)
  
  const regions: Record<string, number> = {}
  const missingRegions: Record<string, number> = {}
  let under18 = 0
  let missingData = 0
  
  // Get all zones from database
  const zones = await prisma.zone.findMany({
    select: { code: true, electionType: true, name: true }
  })
  
  const zoneMap = new Map<string, boolean>()
  zones.forEach(z => {
    zoneMap.set(`${z.code}:${z.electionType}`, true)
  })
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < colRegion + 1) continue
    
    const voterId = values[colVoterId]?.trim() || ''
    const name = values[colName]?.trim() || ''
    const dob = values[colDob]?.trim() || ''
    const age = parseInt(values[colAge] || '0') || 0
    const region = values[colRegion]?.trim() || ''
    const city = values[colCity]?.trim() || ''
    
    if (!voterId || !name || !dob) {
      missingData++
      continue
    }
    
    if (age < 18) {
      under18++
      continue
    }
    
    if (region) {
      regions[region] = (regions[region] || 0) + 1
      
      // Check if region is mapped
      const normalizedRegion = region === 'Anjar-Anya Gujarat' 
        ? (city?.toLowerCase().includes('anjar') || city?.toLowerCase().includes('adipur') || city?.toLowerCase().includes('mandvi') ? 'Anjar' : 'Anya Gujarat')
        : region
      
      const mapping = REGION_TO_ZONE_MAPPING[normalizedRegion] || REGION_TO_ZONE_MAPPING[region]
      
      if (!mapping) {
        missingRegions[region] = (missingRegions[region] || 0) + 1
      } else {
        // Check if zones exist
        const karobariZone = age >= 18 ? zoneMap.get(`${mapping.karobari}:KAROBARI_MEMBERS`) : null
        const trusteeZone = age >= 18 ? zoneMap.get(`${mapping.trustee}:TRUSTEES`) : null
        const yuvaZone = (age >= 18 && age <= 39) ? zoneMap.get(`${mapping.yuvaPank}:YUVA_PANK`) : null
        
        if (!karobariZone && !trusteeZone && !yuvaZone) {
          missingRegions[`${region} (no zones)`] = (missingRegions[`${region} (no zones)`] || 0) + 1
        }
      }
    }
  }
  
  console.log(`\n📊 Region distribution:`)
  Object.entries(regions).sort((a, b) => b[1] - a[1]).forEach(([region, count]) => {
    console.log(`   ${region}: ${count}`)
  })
  
  console.log(`\n⚠️  Missing/unmapped regions:`)
  Object.entries(missingRegions).sort((a, b) => b[1] - a[1]).forEach(([region, count]) => {
    console.log(`   ${region}: ${count}`)
  })
  
  console.log(`\n📊 Summary:`)
  console.log(`   Total rows: ${lines.length - 1}`)
  console.log(`   Missing data: ${missingData}`)
  console.log(`   Under 18: ${under18}`)
  console.log(`   Unmapped regions: ${Object.values(missingRegions).reduce((a, b) => a + b, 0)}`)
  console.log(`   Expected to process: ${lines.length - 1 - missingData - under18 - Object.values(missingRegions).reduce((a, b) => a + b, 0)}`)
  
  await prisma.$disconnect()
}

diagnose().catch(console.error)

