#!/usr/bin/env node

/**
 * Quick test to verify the original language fix
 */

import { OrchestrationService } from './src/subtools/one-media-complete-upload/services/orchestrationService.js';
import winston from 'winston';

// Create a simple logger
const logger = winston.createLogger({
  level: 'info',
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

// Test data with original_language (singular)
const testDescriptionData = {
  episode_title: "Test Original Language Fix",
  media_type: "video",
  original_language: "Coréen",  // This is the singular field from Excel
  available_subtitle_languages: "Polonais; Hongrois",
  available_audio_languages: "Grec ; Japonais"
};

console.log("🧪 Testing Original Language Fix");
console.log("================================");
console.log("Input data:");
console.log("  original_language:", testDescriptionData.original_language);
console.log("");

// Create the service instance
const orchestrationService = new OrchestrationService(testConfig, logger);

// Test the mapping function
try {
  const apiData = orchestrationService.mapExcelToApiSchemaTextOnly(testDescriptionData);

  console.log("✅ Mapping completed successfully!");
  console.log("");
  console.log("API Payload contains:");
  console.log("  original_language_names:", apiData.original_language_names);
  console.log("  available_subtitle_language_names:", apiData.available_subtitle_language_names);
  console.log("  available_audio_language_names:", apiData.available_audio_language_names);
  console.log("");

  if (apiData.original_language_names) {
    console.log("🎉 SUCCESS: original_language_names field is present!");
    console.log("   Value:", apiData.original_language_names);
    console.log("   Type:", Array.isArray(apiData.original_language_names) ? 'Array' : typeof apiData.original_language_names);
    console.log("   Length:", apiData.original_language_names.length);
  } else {
    console.log("❌ FAILURE: original_language_names field is missing from API payload");
  }

} catch (error) {
  console.log("❌ Error during mapping:", error.message);
}