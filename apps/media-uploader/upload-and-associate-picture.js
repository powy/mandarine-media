#!/usr/bin/env node

/**
 * Reusable Picture Upload & Association Script
 *
 * Uploads a picture to S3, creates a backend record, and associates it to a media description.
 * Auto-detects format from image dimensions and updates the correct field.
 *
 * Usage:
 *   node upload-and-associate-picture.js <picturePath> <mediaDescriptionId> <configPath>
 *
 * Example:
 *   node upload-and-associate-picture.js "./poster.jpg" "abc-123-def" "../../goodconfig.ini"
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration Loading
// ============================================================================

/**
 * Parse INI file into a configuration object
 */
function parseIniFile(filePath) {
  const content = fsSync.readFileSync(filePath, 'utf-8');
  const config = {};
  let currentSection = null;

  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue;
    }

    // Section header
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const sectionName = trimmed.slice(1, -1);
      const parts = sectionName.split('.');

      let current = config;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!current[part]) current[part] = {};
        if (i < parts.length - 1) {
          current = current[part];
        }
      }

      currentSection = sectionName;
      continue;
    }

    // Key-value pair
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0 && currentSection) {
      const key = trimmed.substring(0, equalIndex).trim();
      const value = trimmed.substring(equalIndex + 1).trim();

      // Navigate to the correct section
      const parts = currentSection.split('.');
      let current = config;
      for (const part of parts) {
        if (!current[part]) current[part] = {};
        if (part !== parts[parts.length - 1]) {
          current = current[part];
        }
      }

      const lastPart = parts[parts.length - 1];
      current[lastPart][key] = value;
    }
  }

  return config;
}

// ============================================================================
// Format Detection
// ============================================================================

/**
 * Detect picture format from dimensions
 */
function detectFormat(width, height) {
  const formats = [
    { width: 1920, height: 1080, format: '1920x1080', displayFormat: '16:9 (1920x1080)', field: 'image_1920x1080_id' },
    { width: 1920, height: 720, format: '1920x720', displayFormat: '8:3 (1920x720)', field: 'image_1920x720_id' },
    { width: 1080, height: 1080, format: '1080x1080', displayFormat: '1:1 (1080x1080)', field: 'image_1080x1080_id' },
    { width: 810, height: 1080, format: '810x1080', displayFormat: '3:4 (810x1080)', field: 'image_810x1080_id' },
    { width: 1080, height: 1920, format: '1080x1920', displayFormat: '9:16 (1080x1920)', field: 'image_1080x1920_id' }
  ];

  const match = formats.find(f => f.width === width && f.height === height);

  if (!match) {
    throw new Error(`Unsupported image dimensions: ${width}x${height}. Supported formats: ${formats.map(f => f.displayFormat).join(', ')}`);
  }

  return match;
}

// ============================================================================
// S3 Upload
// ============================================================================

/**
 * Upload picture to S3
 */
async function uploadToS3(picturePath, s3Config) {
  console.log('☁️  Uploading to S3...');

  const s3Client = new S3Client({
    region: s3Config.region,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey
    }
  });

  const fileContent = await fs.readFile(picturePath);
  const fileName = path.basename(picturePath);
  const timestamp = Date.now();
  const key = `${s3Config.keyPrefix}${timestamp}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
    Body: fileContent,
    ContentType: 'image/jpeg'
  });

  await s3Client.send(command);

  const s3Url = `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`;
  console.log(`✅ Uploaded to S3: ${s3Url}`);

  return s3Url;
}

// ============================================================================
// Backend API
// ============================================================================

/**
 * Authenticate with backend API
 */
async function authenticate(apiConfig) {
  const formData = new URLSearchParams();
  formData.append('username', apiConfig.username);
  formData.append('password', apiConfig.password);

  const response = await axios.post(`${apiConfig.baseUrl}/api/v1/auth/login`, formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  if (!response.data || !response.data.access_token) {
    throw new Error('No access token received from authentication');
  }

  return response.data.access_token;
}

/**
 * Create picture record in backend
 */
async function createPictureRecord(s3Url, metadata, apiConfig, token) {
  console.log('🔗 Creating picture record in API...');

  const pictureData = {
    url: s3Url,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    file_size_bytes: metadata.fileSizeBytes,
    alt_text: metadata.altText || `Image in ${metadata.displayFormat} format`
  };

  const response = await axios.post(`${apiConfig.baseUrl}/api/v1/pictures`, pictureData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log(`✅ Picture record created: ${response.data.id}`);
  return response.data;
}

/**
 * Associate picture to media description
 */
async function associatePictureToMedia(mediaDescriptionId, pictureId, fieldName, apiConfig, token) {
  console.log(`🔗 Associating picture to media description field: ${fieldName}...`);

  const updateData = { [fieldName]: pictureId };

  const response = await axios.patch(
    `${apiConfig.baseUrl}/api/v1/media-descriptions/${mediaDescriptionId}`,
    updateData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log(`✅ Picture associated to ${fieldName}`);
  return response.data;
}

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  console.log('🖼️  Picture Upload & Association Tool\n');

  // Parse arguments
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('❌ Missing required arguments\n');
    console.log('Usage:');
    console.log('  node upload-and-associate-picture.js <picturePath> <mediaDescriptionId> <configPath>\n');
    console.log('Example:');
    console.log('  node upload-and-associate-picture.js "./poster.jpg" "abc-123-def" "../../goodconfig.ini"');
    process.exit(1);
  }

  const [picturePath, mediaDescriptionId, configPath] = args;

  console.log('📋 Configuration:');
  console.log(`   Picture: ${picturePath}`);
  console.log(`   Media Description ID: ${mediaDescriptionId}`);
  console.log(`   Config: ${configPath}\n`);

  try {
    // Step 1: Validate inputs
    if (!fsSync.existsSync(picturePath)) {
      throw new Error(`Picture file not found: ${picturePath}`);
    }

    if (!fsSync.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    // Step 2: Load configuration
    console.log('📖 Loading configuration...');
    const config = parseIniFile(configPath);
    console.log('✅ Configuration loaded\n');

    // Step 3: Extract image metadata
    console.log('📊 Reading image metadata...');
    const imageBuffer = await fs.readFile(picturePath);
    const sharpInstance = sharp(imageBuffer);
    const imageMetadata = await sharpInstance.metadata();

    const metadata = {
      width: imageMetadata.width,
      height: imageMetadata.height,
      format: imageMetadata.format,
      fileSizeBytes: fsSync.statSync(picturePath).size
    };

    console.log(`   Dimensions: ${metadata.width}x${metadata.height}`);
    console.log(`   Size: ${(metadata.fileSizeBytes / 1024).toFixed(2)} KB`);
    console.log(`   Format: ${metadata.format}`);

    // Step 4: Detect format
    const formatInfo = detectFormat(metadata.width, metadata.height);
    metadata.displayFormat = formatInfo.displayFormat;
    console.log(`✅ Format detected: ${formatInfo.displayFormat}\n`);

    // Step 5: Upload to S3
    const s3Config = {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
      region: config.s3.region,
      bucket: config.s3.pictures.bucket,
      keyPrefix: config.s3.pictures.keyPrefix
    };

    const s3Url = await uploadToS3(picturePath, s3Config);
    console.log();

    // Step 6: Authenticate with backend
    console.log('🔐 Authenticating...');
    const apiConfig = {
      baseUrl: config.backend.baseUrl,
      username: config.backend.username,
      password: config.backend.password
    };

    const token = await authenticate(apiConfig);
    console.log('✅ Authenticated\n');

    // Step 7: Create picture record
    const pictureRecord = await createPictureRecord(s3Url, metadata, apiConfig, token);
    console.log();

    // Step 8: Associate to media description
    await associatePictureToMedia(
      mediaDescriptionId,
      pictureRecord.id,
      formatInfo.field,
      apiConfig,
      token
    );

    // Success!
    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS');
    console.log('='.repeat(60));
    console.log(`Picture ID: ${pictureRecord.id}`);
    console.log(`S3 URL: ${s3Url}`);
    console.log(`Media Description: ${mediaDescriptionId}`);
    console.log(`Field Updated: ${formatInfo.field}`);
    console.log(`Format: ${formatInfo.displayFormat}`);
    console.log('='.repeat(60));

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
