/**
 * Upload Subtitle from Excel File
 * Extracts media description ID from Excel, then uploads
 *
 * This function adds Excel reading layer on top of uploadFromMediaDescriptionId
 * Reuses ExcelService from one-media-complete-upload
 */

import path from 'path';
import fs from 'fs-extra';
import { uploadFromMediaDescriptionId } from './uploadFromMediaDescriptionId.js';
import { ExcelService } from '../../one-media-complete-upload/services/excelService.js';

/**
 * Upload subtitle file using Excel file (extract media description ID)
 *
 * @param {Object} params - Upload parameters
 *
 * @param {string} params.excelPath - Full path to Excel file (0_desc_*.xlsx) (required)
 * @param {string} params.subtitlePath - Full path to subtitle file (required)
 * @param {string} params.language - BCP 47 language code (required)
 *
 * @param {string} params.backendBaseUrl - Backend API base URL (required)
 * @param {string} params.backendUsername - Backend username (required)
 * @param {string} params.backendPassword - Backend password (required)
 *
 * @param {string} params.muxTokenId - Mux API token ID (required)
 * @param {string} params.muxTokenSecret - Mux API token secret (required)
 *
 * @param {string} params.s3AccessKeyId - AWS S3 access key ID (required)
 * @param {string} params.s3SecretAccessKey - AWS S3 secret access key (required)
 * @param {string} params.s3Region - AWS S3 region (required)
 * @param {string} params.s3BucketName - AWS S3 bucket name (required)
 *
 * @param {string} [params.subtitleName] - Display name for subtitle track
 * @param {boolean} [params.isDefault=false] - Mark as default subtitle track
 * @param {boolean} [params.closedCaptions=false] - Mark as closed captions
 * @param {string} [params.textType='subtitles'] - Text type
 * @param {string} [params.passthrough] - Custom passthrough data
 *
 * @param {Object} [params.options] - Upload options (see uploadFromAssetId)
 * @param {Object} [params.logger=console] - Logger object
 *
 * @returns {Promise<Object>} Upload result (see uploadFromAssetId)
 * @returns {string} result.excelPath - Excel file path used
 * @returns {string} result.mediaDescriptionId - Media description ID extracted
 * @returns {string} result.videoFileId - Video file ID fetched
 * @returns {string} result.assetId - Mux asset ID fetched
 *
 * @throws {Error} If Excel file not found
 * @throws {Error} If media description ID not found in Excel
 * @throws {Error} If backend authentication fails
 * @throws {Error} If upload fails (see uploadFromMediaDescriptionId)
 *
 * @example
 * const result = await uploadFromExcel({
 *   excelPath: '/path/to/folder/0_desc_episode1.xlsx',
 *   subtitlePath: '/path/to/subtitle_en.srt',
 *   language: 'en',
 *   backendBaseUrl: 'https://api.example.com',
 *   backendUsername: 'user',
 *   backendPassword: 'pass',
 *   muxTokenId: 'your-token-id',
 *   muxTokenSecret: 'your-token-secret',
 *   s3AccessKeyId: 'your-access-key',
 *   s3SecretAccessKey: 'your-secret-key',
 *   s3Region: 'us-east-1',
 *   s3BucketName: 'my-bucket'
 * });
 */
export async function uploadFromExcel(params) {
  const {
    excelPath,
    subtitlePath,
    language,
    backendBaseUrl,
    backendUsername,
    backendPassword,
    muxTokenId,
    muxTokenSecret,
    s3AccessKeyId,
    s3SecretAccessKey,
    s3Region,
    s3BucketName,
    subtitleName,
    isDefault,
    closedCaptions,
    textType,
    passthrough,
    options,
    logger = console
  } = params;

  // Validate required parameters
  if (!excelPath) throw new Error('excelPath is required');
  if (!subtitlePath) throw new Error('subtitlePath is required');
  if (!language) throw new Error('language is required');
  if (!backendBaseUrl) throw new Error('backendBaseUrl is required');
  if (!backendUsername) throw new Error('backendUsername is required');
  if (!backendPassword) throw new Error('backendPassword is required');
  if (!muxTokenId) throw new Error('muxTokenId is required');
  if (!muxTokenSecret) throw new Error('muxTokenSecret is required');
  if (!s3AccessKeyId) throw new Error('s3AccessKeyId is required');
  if (!s3SecretAccessKey) throw new Error('s3SecretAccessKey is required');
  if (!s3Region) throw new Error('s3Region is required');
  if (!s3BucketName) throw new Error('s3BucketName is required');

  logger.info?.(`[uploadFromExcel] Starting upload from Excel: ${path.basename(excelPath)}`);

  // Step 1: Validate Excel file exists
  if (!await fs.pathExists(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  // Step 2: Initialize ExcelService
  const folderPath = path.dirname(excelPath);
  const excelService = new ExcelService(folderPath, logger);

  // Step 3: Read Excel file
  logger.info?.(`[uploadFromExcel] Reading Excel file...`);
  const excelData = await excelService.readExcelFile(excelPath);

  if (!excelData || !excelData.description) {
    throw new Error(`Invalid Excel file: no description sheet found in ${excelPath}`);
  }

  // Step 4: Extract media description ID
  logger.info?.(`[uploadFromExcel] Extracting media description ID...`);
  let mediaDescriptionId = null;

  // Primary field: 'id'
  if (excelData.description.id) {
    mediaDescriptionId = excelData.description.id;
    logger.info?.(`[uploadFromExcel] Found media description ID in 'id' field: ${mediaDescriptionId}`);
  } else {
    // Alternative fields
    const possibleIdFields = ['media_description_id', 'media_id', 'description_id', 'uuid', 'guid'];
    for (const field of possibleIdFields) {
      if (excelData.description[field]) {
        mediaDescriptionId = excelData.description[field];
        logger.info?.(`[uploadFromExcel] Found media ID in field '${field}': ${mediaDescriptionId}`);
        break;
      }
    }
  }

  if (!mediaDescriptionId) {
    const availableFields = Object.keys(excelData.description || {}).join(', ');
    throw new Error(
      `No media description ID found in Excel file: ${excelPath}. ` +
      `Tried fields: id, media_description_id, media_id, description_id, uuid, guid. ` +
      `Available fields: ${availableFields}`
    );
  }

  // Step 5: Call uploadFromMediaDescriptionId with the extracted ID
  logger.info?.('[uploadFromExcel] Proceeding with media description-based upload...');
  const result = await uploadFromMediaDescriptionId({
    mediaDescriptionId,
    subtitlePath,
    language,
    backendBaseUrl,
    backendUsername,
    backendPassword,
    muxTokenId,
    muxTokenSecret,
    s3AccessKeyId,
    s3SecretAccessKey,
    s3Region,
    s3BucketName,
    subtitleName,
    isDefault,
    closedCaptions,
    textType,
    passthrough,
    options,
    logger
  });

  logger.info?.('[uploadFromExcel] Upload completed successfully');

  // Return result with additional context
  return {
    ...result,
    excelPath,
    // mediaDescriptionId, videoFileId, assetId are already in result
  };
}

export default { uploadFromExcel };
