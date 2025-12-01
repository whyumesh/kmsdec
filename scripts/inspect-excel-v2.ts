import ExcelJS from 'exceljs'

const DEFAULT_FILE = 'Final Date for Input 2.0.xlsx'

async function inspectExcel() {
  console.log(`📥 Reading Excel file: ${DEFAULT_FILE}`)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(DEFAULT_FILE)

  let worksheet = workbook.getWorksheet(1)
  if (!worksheet) {
    worksheet = workbook.worksheets[0]
  }
  if (!worksheet) {
    throw new Error('No worksheet found')
  }

  console.log(`\n📊 Worksheet: ${worksheet.name}`)
  console.log(`   Total rows: ${worksheet.rowCount}`)
  console.log(`   Total columns: ${worksheet.columnCount}\n`)

  // Read header row
  const headerRow = worksheet.getRow(1)
  console.log('📋 Column Headers:')
  const columnMap: Record<string, number> = {}
  
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = cell.value?.toString().trim() || ''
    columnMap[header] = colNumber
    console.log(`   Column ${colNumber}: "${header}"`)
  })

  console.log('\n📝 Sample data (first 3 rows after header):')
  for (let rowNum = 2; rowNum <= Math.min(4, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum)
    console.log(`\n   Row ${rowNum}:`)
    Object.entries(columnMap).forEach(([name, index]) => {
      const value = row.getCell(index).value
      const displayValue = value?.toString().substring(0, 50) || '(empty)'
      console.log(`     ${name}: ${displayValue}`)
    })
  }

  // Check for "Voting Region" column
  if (columnMap['Voting Region']) {
    console.log('\n✅ Found "Voting Region" column')
  } else {
    console.log('\n⚠️  "Voting Region" column not found!')
    console.log('   Available columns:', Object.keys(columnMap).join(', '))
  }

  // Check for phone/mobile columns
  const phoneColumns = Object.keys(columnMap).filter(k => 
    k.toLowerCase().includes('phone') || 
    k.toLowerCase().includes('mobile')
  )
  if (phoneColumns.length > 0) {
    console.log(`\n✅ Found phone columns: ${phoneColumns.join(', ')}`)
  } else {
    console.log('\n⚠️  No phone/mobile column found!')
  }
}

inspectExcel()
  .then(() => {
    console.log('\n✅ Inspection complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

