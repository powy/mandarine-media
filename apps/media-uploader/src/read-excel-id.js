import ExcelJS from 'exceljs';

async function readSeasonId(excelPath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const descriptionSheet = workbook.getWorksheet('Description');
    if (!descriptionSheet) {
      console.log('No Description sheet found');
      return;
    }

    let mediaType = null;
    let mediaDescriptionId = null;

    descriptionSheet.eachRow((row, rowNumber) => {
      const field = row.getCell(1).value;
      const value = row.getCell(2).value;

      if (field === 'media_type') {
        mediaType = value;
      }
      if (field === 'id') {
        mediaDescriptionId = value;
      }
    });

    console.log('Media Type:', mediaType);
    console.log('Season ID:', mediaDescriptionId);

  } catch (error) {
    console.error('Error reading Excel:', error.message);
  }
}

const excelPath = process.argv[2];
if (!excelPath) {
  console.error('Usage: node read-excel-id.js <excel-file-path>');
  process.exit(1);
}

readSeasonId(excelPath);
