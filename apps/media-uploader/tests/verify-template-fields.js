#!/usr/bin/env node

/**
 * Verify what fields are currently in the Excel template and identify missing ones
 */

import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyTemplate() {
  console.log("🔍 Verifying Excel Template Fields");
  console.log("==================================");

  const templatePath = path.join(__dirname, 'src', 'subtools', 'one-media-complete-upload', 'templates', '0_desc_template.xlsx');

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    console.log(`\n📊 Workbook has ${workbook.worksheets.length} sheets:`);
    workbook.worksheets.forEach((sheet, index) => {
      console.log(`  ${index + 1}. "${sheet.name}"`);
    });

    // Look for description sheet
    let descriptionSheet = workbook.worksheets.find(sheet =>
      sheet.name.toLowerCase().includes('desc') ||
      sheet.name.toLowerCase().includes('description')
    );

    if (!descriptionSheet) {
      // If no description sheet found, try the second sheet (first is usually Files)
      descriptionSheet = workbook.worksheets[1] || workbook.worksheets[0];
    }

    console.log(`\n📋 Using Sheet: "${descriptionSheet.name}"`);

    const allFields = [];
    const languageCountryFields = [];

    console.log(`\n🔍 Raw Sheet Content (first 20 rows):`);
    console.log("─".repeat(80));

    // Read all rows to find description structure
    descriptionSheet.eachRow((row, rowNumber) => {
      const values = row.values.slice(1); // Remove undefined first element

      // Show first 20 rows for debugging
      if (rowNumber <= 20) {
        console.log(`Row ${rowNumber}: [${values.map(v => `"${v || ''}"`).join(', ')}]`);
      }

      if (values.length >= 2 && values[1]) { // Relaxed condition to see more data
        const frenchDescription = values[0] || '';
        const technicalKey = values[1];
        const value = values[2] || '';

        allFields.push({
          row: rowNumber,
          french: frenchDescription,
          key: technicalKey,
          value: value
        });

        // Check for language/country related fields
        if (technicalKey && typeof technicalKey === 'string') {
          const keyLower = technicalKey.toLowerCase();
          const frenchLower = (frenchDescription || '').toLowerCase();

          if (keyLower.includes('language') || keyLower.includes('country') ||
              keyLower.includes('langue') || keyLower.includes('pays') ||
              frenchLower.includes('langue') || frenchLower.includes('pays')) {
            languageCountryFields.push({
              row: rowNumber,
              french: frenchDescription,
              key: technicalKey,
              value: value
            });
          }
        }
      }
    });

    console.log(`\n📊 Template Analysis:`);
    console.log(`  Total fields found: ${allFields.length}`);
    console.log(`  Language/Country fields: ${languageCountryFields.length}`);

    console.log(`\n🌍 Language/Country Related Fields:`);
    console.log("─".repeat(80));
    languageCountryFields.forEach(field => {
      console.log(`Row ${field.row}: "${field.french}" → "${field.key}" = "${field.value}"`);
    });

    // Check for specific fields we need
    console.log(`\n🔍 Checking for Required Fields:`);
    console.log("─".repeat(50));

    const requiredFields = [
      { key: 'original_language', french: 'Langue originale', required: true },
      { key: 'origin_country', french: 'Pays d\'origine', required: true },
      { key: 'available_countries_id_list', french: 'Pays disponibles', required: false }
    ];

    requiredFields.forEach(required => {
      const found = allFields.find(field =>
        field.key === required.key ||
        (field.french && field.french.toLowerCase().includes(required.french.toLowerCase()))
      );

      if (found) {
        console.log(`  ✅ ${required.key}: Found at row ${found.row} ("${found.french}")`);
      } else {
        const status = required.required ? '❌ MISSING' : '⚠️  Optional';
        console.log(`  ${status}: ${required.key} ("${required.french}")`);
      }
    });

    console.log(`\n📝 Summary:`);
    console.log("─".repeat(30));

    // Check if origin_country is missing
    const hasOriginCountry = allFields.some(field =>
      field.key === 'origin_country' ||
      field.key === 'origin_countries' ||
      (field.french && field.french.toLowerCase().includes('pays') && field.french.toLowerCase().includes('origine'))
    );

    const hasOriginalLanguage = allFields.some(field =>
      field.key === 'original_language' ||
      (field.french && field.french.toLowerCase().includes('langue') && field.french.toLowerCase().includes('originale'))
    );

    if (hasOriginalLanguage) {
      console.log("✅ Original language field exists");
    } else {
      console.log("❌ Original language field missing");
    }

    if (hasOriginCountry) {
      console.log("✅ Origin country field exists");
    } else {
      console.log("❌ Origin country field missing - THIS IS THE PROBLEM!");
      console.log("   Need to add: \"Pays d'origine\" → \"origin_country\" → [value]");
    }

  } catch (error) {
    console.error("❌ Error reading template:", error.message);
  }
}

verifyTemplate();