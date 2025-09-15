#!/usr/bin/env node

/**
 * Comprehensive test to verify both original languages and origin countries fixes
 */

import { OrchestrationService } from './src/subtools/one-media-complete-upload/services/orchestrationService.js';
import winston from 'winston';

// Create a simple logger
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console()
  ]
});

// Test configuration
const testConfig = {
  backend: {
    baseUrl: "http://localhost:8000",
    username: "admin@kyool.com",
    password: "admin123"
  }
};

console.log("🧪 Testing Original Languages & Origin Countries Fix");
console.log("===================================================");

// Test cases for different field variations
const testCases = [
  {
    name: "Singular fields (from Excel)",
    data: {
      episode_title: "Test Singular Fields",
      media_type: "video",
      original_language: "Coréen",
      origin_country: "Corée du Sud",
      available_subtitle_languages: "Polonais; Hongrois"
    }
  },
  {
    name: "Plural fields (alternative format)",
    data: {
      episode_title: "Test Plural Fields",
      media_type: "video",
      original_languages: "Japonais ; Anglais",
      origin_countries: "Japon; États-Unis",
      available_audio_languages: "Grec ; Japonais"
    }
  },
  {
    name: "List fields (array format)",
    data: {
      episode_title: "Test List Fields",
      media_type: "video",
      original_languages_list: ["Français", "Italien"],
      origin_countries_list: ["France", "Italie"],
      available_subtitle_languages: "Espagnol"
    }
  },
  {
    name: "Alternative naming (origin_country_name)",
    data: {
      episode_title: "Test Alternative Naming",
      media_type: "video",
      original_language: "Allemand",
      origin_country_name: "Allemagne",
      available_audio_languages: "Allemand; Anglais"
    }
  },
  {
    name: "Mixed formats",
    data: {
      episode_title: "Test Mixed Formats",
      media_type: "video",
      original_language: "Chinois",
      origin_countries: "Chine ; Taiwan",
      available_subtitle_languages: "Français; Anglais",
      available_audio_languages: "Chinois"
    }
  }
];

// Create the service instance
const orchestrationService = new OrchestrationService(testConfig, logger);

// Test each case
for (const testCase of testCases) {
  console.log(`\n📋 Test Case: ${testCase.name}`);
  console.log("─".repeat(50));

  console.log("Input data:");
  if (testCase.data.original_language) console.log(`  original_language: "${testCase.data.original_language}"`);
  if (testCase.data.original_languages) console.log(`  original_languages: "${testCase.data.original_languages}"`);
  if (testCase.data.original_languages_list) console.log(`  original_languages_list:`, testCase.data.original_languages_list);
  if (testCase.data.origin_country) console.log(`  origin_country: "${testCase.data.origin_country}"`);
  if (testCase.data.origin_country_name) console.log(`  origin_country_name: "${testCase.data.origin_country_name}"`);
  if (testCase.data.origin_countries) console.log(`  origin_countries: "${testCase.data.origin_countries}"`);
  if (testCase.data.origin_countries_list) console.log(`  origin_countries_list:`, testCase.data.origin_countries_list);

  try {
    const apiData = orchestrationService.mapExcelToApiSchemaTextOnly(testCase.data);

    console.log("\n✅ Mapping completed successfully!");
    console.log("API Payload contains:");

    // Check original languages
    if (apiData.original_language_names) {
      console.log(`  ✓ original_language_names: [${apiData.original_language_names.map(lang => `"${lang}"`).join(', ')}]`);
    } else {
      console.log("  ❌ original_language_names: MISSING");
    }

    // Check origin countries
    if (apiData.origin_country_names) {
      console.log(`  ✓ origin_country_names: [${apiData.origin_country_names.map(country => `"${country}"`).join(', ')}]`);
    } else {
      console.log("  ❌ origin_country_names: MISSING");
    }

    // Check other language fields for completeness
    if (apiData.available_subtitle_language_names) {
      console.log(`  ℹ️  available_subtitle_language_names: [${apiData.available_subtitle_language_names.map(lang => `"${lang}"`).join(', ')}]`);
    }
    if (apiData.available_audio_language_names) {
      console.log(`  ℹ️  available_audio_language_names: [${apiData.available_audio_language_names.map(lang => `"${lang}"`).join(', ')}]`);
    }

  } catch (error) {
    console.log(`❌ Error during mapping: ${error.message}`);
    if (error.stack) {
      console.log("Stack trace:", error.stack);
    }
  }
}

console.log("\n🎯 Test Summary");
console.log("================");
console.log("Both original_language_names and origin_country_names fields should be present in all test cases.");
console.log("The fixes should handle all field variations: singular, plural, list, and alternative naming.");