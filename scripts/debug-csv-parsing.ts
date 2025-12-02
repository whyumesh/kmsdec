import * as fs from 'fs'

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

const filePath = 'Final Date for Input 2.0.csv'
const fileContent = fs.readFileSync(filePath, 'utf-8')
const lines = fileContent.split('\n').filter(line => line.trim() !== '')

console.log(`Total lines: ${lines.length}`)
console.log(`Expected data rows: ${lines.length - 1}\n`)

// Parse header
const header = parseCSVLine(lines[0])
console.log(`Header columns (${header.length}):`, header.join(' | '))

const getColumnIndex = (name: string): number => {
  const index = header.findIndex(col => col.toLowerCase().includes(name.toLowerCase()))
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

console.log(`\nColumn indices:`)
console.log(`  VoterId: ${colVoterId}`)
console.log(`  Name: ${colName}`)
console.log(`  DOB: ${colDob}`)
console.log(`  Age: ${colAge}`)
console.log(`  Mobile: ${colMobile}`)
console.log(`  Address: ${colAddress}`)
console.log(`  City: ${colCity}`)
console.log(`  State: ${colState}`)
console.log(`  Region: ${colRegion}`)
console.log(`  Email: ${colEmail}`)

// Check first 10 rows
console.log(`\n\nFirst 10 data rows:`)
for (let i = 1; i <= Math.min(10, lines.length - 1); i++) {
  const values = parseCSVLine(lines[i])
  console.log(`\nRow ${i}:`)
  console.log(`  Columns: ${values.length}`)
  console.log(`  VoterId: ${values[colVoterId] || 'MISSING'}`)
  console.log(`  Name: ${values[colName] || 'MISSING'}`)
  console.log(`  DOB: ${values[colDob] || 'MISSING'}`)
  console.log(`  Age: ${values[colAge] || 'MISSING'}`)
  console.log(`  Region: ${values[colRegion] || 'MISSING'}`)
  console.log(`  City: ${values[colCity] || 'MISSING'}`)
}

// Check regions distribution
console.log(`\n\nChecking regions in first 100 rows...`)
const regions: Record<string, number> = {}
for (let i = 1; i <= Math.min(100, lines.length - 1); i++) {
  const values = parseCSVLine(lines[i])
  const region = values[colRegion]?.trim() || 'MISSING'
  regions[region] = (regions[region] || 0) + 1
}

console.log(`\nRegion distribution (first 100 rows):`)
Object.entries(regions).forEach(([region, count]) => {
  console.log(`  ${region}: ${count}`)
})

// Check for parsing issues
console.log(`\n\nChecking for parsing issues...`)
let issues = 0
for (let i = 1; i <= Math.min(1000, lines.length - 1); i++) {
  const values = parseCSVLine(lines[i])
  if (values.length < header.length - 2) {
    issues++
    if (issues <= 5) {
      console.log(`  Row ${i}: Only ${values.length} columns (expected ~${header.length})`)
    }
  }
}
if (issues > 5) {
  console.log(`  ... and ${issues - 5} more rows with column count issues`)
}

