import ExcelJS from 'exceljs';

async function fillExcelWithTestData() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('C:/Users/powyp/AppData/Local/Temp/kyool_test_upload_with_files/0_list_filled_test.xlsx');
  
  // Fill Description sheet
  const descSheet = workbook.getWorksheet('Description');
  if (descSheet) {
    const data = [
      ['episode', 'Test Episode Title'],
      ['season', 'Test Season'],
      ['program', 'Test Program'],
      ['media_type', 'video'],
      ['media_categories', 'documentary;educational'],
      ['policy', 'public'],
      ['description_en', 'Test English description for JWT upload test'],
      ['description_fr', 'Description française pour test JWT'],
      ['description_ko', 'JWT 업로드 테스트를 위한 한국어 설명'],
      ['episode_title', 'JWT Authentication Test Episode']
    ];
    
    data.forEach(([key, value], index) => {
      const row = index + 2; // Start from row 2
      descSheet.getCell(`B${row}`).value = key;
      descSheet.getCell(`C${row}`).value = value;
    });
  }
  
  // Fill Files sheet
  const filesSheet = workbook.getWorksheet('Files');
  if (filesSheet) {
    // Headers are already in row 1, data starts at row 2
    filesSheet.getCell('A2').value = 'video';
    filesSheet.getCell('B2').value = 'test_video.mp4';
    filesSheet.getCell('C2').value = 'test_poster.jpg';
    filesSheet.getCell('D2').value = 'test_subtitles_fr.srt';
    filesSheet.getCell('E2').value = '';  // EN subtitle empty
    filesSheet.getCell('F2').value = '';  // KO subtitle empty
  }
  
  await workbook.xlsx.writeFile('C:/Users/powyp/AppData/Local/Temp/kyool_test_upload_with_files/0_list_filled_test.xlsx');
  console.log('Excel file filled with test data');
}

fillExcelWithTestData().catch(console.error);