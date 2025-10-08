import ExcelJS from 'exceljs';

async function inspectExcel(excelPath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    console.log('\n=== Excel File Inspection ===\n');
    console.log('Worksheets found:', workbook.worksheets.length);

    workbook.eachSheet((worksheet, sheetId) => {
      console.log(`\nSheet ${sheetId}: "${worksheet.name}"`);
      console.log(`Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);

      console.log('\nFirst 20 rows:');
      let rowCount = 0;
      worksheet.eachRow((row, rowNumber) => {
        if (rowCount < 20) {
          const cell1 = row.getCell(1).value;
          const cell2 = row.getCell(2).value;
          const cell3 = row.getCell(3).value;
          console.log(`Row ${rowNumber}: [${cell1}] | [${cell2}] | [${cell3}]`);
          rowCount++;
        }
      });
    });

  } catch (error) {
    console.error('Error reading Excel:', error.message);
  }
}

const excelPath = process.argv[2];
if (!excelPath) {
  console.error('Usage: node inspect-excel.js <excel-file-path>');
  process.exit(1);
}

inspectExcel(excelPath);
