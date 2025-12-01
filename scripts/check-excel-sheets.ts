import ExcelJS from 'exceljs'

async function checkExcelSheets() {
  const filePath = 'Final Data for Input.xlsx'
  console.log(`📥 Reading Excel file: ${filePath}\n`)
  
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  
  console.log(`📊 Total worksheets: ${workbook.worksheets.length}\n`)
  
  workbook.worksheets.forEach((worksheet, index) => {
    console.log(`Sheet ${index + 1}: "${worksheet.name}"`)
    console.log(`   Rows: ${worksheet.rowCount}`)
    console.log(`   Columns: ${worksheet.columnCount}`)
    
    // Check first few rows
    if (worksheet.rowCount > 0) {
      const headerRow = worksheet.getRow(1)
      const headers: string[] = []
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        headers.push(cell.value?.toString() || '')
      })
      console.log(`   Headers (first 10): ${headers.slice(0, 10).join(', ')}`)
    }
    console.log()
  })
  
  // Check if "Master Data" sheet exists
  const masterDataSheet = workbook.getWorksheet('Master Data')
  if (masterDataSheet) {
    console.log(`✅ Found "Master Data" sheet with ${masterDataSheet.rowCount} rows`)
  } else {
    console.log(`❌ "Master Data" sheet not found`)
  }
}

checkExcelSheets()
  .then(() => {
    console.log('\n✅ Check completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })



