#!/usr/bin/env node

/**
 * Debug Mux Subtitle Tool
 *
 * Checks subtitle status for a Mux asset and returns structured JSON with:
 * - Subtitle status for en, fr, ko (missing, errored, valid)
 * - Error details if any subtitle is errored
 * - Playback policies with their IDs
 *
 * Usage:
 *   node debug-mux-subtitles.js <assetId>                       (check single asset)
 *   node debug-mux-subtitles.js --list-all                       (list all video files)
 *   node debug-mux-subtitles.js --list-all --limit 5             (test with first 5 files)
 *   node debug-mux-subtitles.js --list-all --export-excel report.xlsx
 *   node debug-mux-subtitles.js --list-all --limit 10 --export-excel test.xlsx
 */

import Mux from '@mux/mux-node';
import axios from 'axios';
import ExcelJS from 'exceljs';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { readIniFile } from './shared/utils/iniParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load configuration from goodconfig.ini
 */
async function loadConfig() {
  try {
    // Look for config in multiple locations
    const possiblePaths = [
      path.join(__dirname, '..', 'goodconfig.ini'),                    // apps/media-uploader/goodconfig.ini
      path.join(__dirname, '..', '..', '..', '..', 'goodconfig.ini'),  // workspace root
      path.join(process.cwd(), 'goodconfig.ini'),                      // current directory
    ];

    let configPath = null;
    for (const testPath of possiblePaths) {
      try {
        const fs = await import('fs-extra');
        if (await fs.pathExists(testPath)) {
          configPath = testPath;
          break;
        }
      } catch (err) {
        continue;
      }
    }

    if (!configPath) {
      throw new Error('goodconfig.ini not found. Searched: ' + possiblePaths.join(', '));
    }

    console.log(chalk.gray(`  Using config: ${configPath}`));
    const iniConfig = await readIniFile(configPath);

    if (!iniConfig.mux?.tokenId || !iniConfig.mux?.tokenSecret) {
      throw new Error('Missing Mux credentials in goodconfig.ini');
    }

    return {
      mux: {
        tokenId: iniConfig.mux.tokenId,
        tokenSecret: iniConfig.mux.tokenSecret
      },
      backend: {
        baseUrl: iniConfig.backend?.baseUrl,
        username: iniConfig.backend?.username,
        password: iniConfig.backend?.password
      }
    };
  } catch (error) {
    throw new Error(`Failed to load config: ${error.message}`);
  }
}

/**
 * Check subtitle status for a Mux asset
 * @param {string} assetId - Mux asset ID
 * @param {Object} config - Configuration object with Mux credentials
 * @returns {Promise<Object>} Structured result with subtitle status and playback policies
 */
async function checkSubtitleStatus(assetId, config) {
  // Initialize Mux client
  const mux = new Mux({
    tokenId: config.mux.tokenId,
    tokenSecret: config.mux.tokenSecret
  });

  try {
    console.log(chalk.cyan(`\nFetching asset data for: ${assetId}`));

    // Retrieve asset from Mux API
    const asset = await mux.video.assets.retrieve(assetId);

    console.log(chalk.green(`✓ Asset retrieved successfully`));
    console.log(chalk.gray(`  Status: ${asset.status}`));
    console.log(chalk.gray(`  Duration: ${asset.duration}s`));

    // Initialize result structure
    const result = {
      assetId: assetId,
      assetStatus: asset.status,
      subtitles: {
        en: { status: 'missing' },
        fr: { status: 'missing' },
        ko: { status: 'missing' }
      },
      playbackPolicies: []
    };

    // Parse tracks to find subtitle tracks
    if (asset.tracks && asset.tracks.length > 0) {
      console.log(chalk.cyan(`\nAnalyzing ${asset.tracks.length} tracks...`));

      const textTracks = asset.tracks.filter(track =>
        track.type === 'text' && track.text_type === 'subtitles'
      );

      console.log(chalk.gray(`  Found ${textTracks.length} subtitle tracks`));

      // Check each language
      for (const lang of ['en', 'fr', 'ko']) {
        const track = textTracks.find(t => t.language_code === lang);

        if (track) {
          // Determine status based on Mux track status
          let status = 'valid';
          if (track.status === 'errored') {
            status = 'errored';
          } else if (track.status === 'preparing') {
            status = 'processing';
          } else if (track.status === 'ready') {
            status = 'valid';
          }

          result.subtitles[lang] = {
            status: status,
            trackId: track.id,
            name: track.name,
            trackStatus: track.status
          };

          // Add error details if errored
          if (track.status === 'errored' && track.error) {
            result.subtitles[lang].error = {
              type: track.error.type,
              messages: track.error.messages || []
            };
          }

          // Log status
          const statusColor = status === 'valid' ? 'green' : (status === 'errored' ? 'red' : 'yellow');
          console.log(chalk[statusColor](`  ${lang.toUpperCase()}: ${status}`) +
                     chalk.gray(` (${track.id})`));

          if (status === 'errored') {
            console.log(chalk.red(`    Error: ${track.error?.type || 'unknown'}`));
            if (track.error?.messages) {
              track.error.messages.forEach(msg => {
                console.log(chalk.red(`    - ${msg}`));
              });
            }
          }
        } else {
          console.log(chalk.gray(`  ${lang.toUpperCase()}: missing`));
        }
      }
    } else {
      console.log(chalk.yellow(`\nNo tracks found on this asset`));
    }

    // Extract playback policies
    if (asset.playback_ids && asset.playback_ids.length > 0) {
      console.log(chalk.cyan(`\nPlayback Policies:`));

      asset.playback_ids.forEach(playbackId => {
        result.playbackPolicies.push({
          id: playbackId.id,
          policy: playbackId.policy
        });

        console.log(chalk.gray(`  ${playbackId.policy}: ${playbackId.id}`));
      });
    } else {
      console.log(chalk.yellow(`\nNo playback policies found`));
    }

    return result;

  } catch (error) {
    console.error(chalk.red(`\nError retrieving asset:`));
    console.error(chalk.red(`  Message: ${error.message}`));

    if (error.response?.status) {
      console.error(chalk.red(`  Status: ${error.response.status}`));
    }

    if (error.response?.data) {
      console.error(chalk.red(`  Details: ${JSON.stringify(error.response.data, null, 2)}`));
    }

    throw error;
  }
}

/**
 * Sleep helper for rate limiting
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Authenticate with backend API
 * @param {Object} backendConfig - Backend configuration
 * @returns {Promise<string>} JWT access token
 */
async function authenticateBackend(backendConfig) {
  if (!backendConfig.baseUrl || !backendConfig.username || !backendConfig.password) {
    throw new Error('Missing backend credentials in goodconfig.ini');
  }

  const loginData = new URLSearchParams();
  loginData.append('username', backendConfig.username);
  loginData.append('password', backendConfig.password);

  const response = await axios.post(
    `${backendConfig.baseUrl}/api/v1/auth/login`,
    loginData,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    }
  );

  return response.data.access_token;
}

/**
 * Fetch all video files with pagination
 * @param {string} baseUrl - Backend base URL
 * @param {string} token - JWT token
 * @returns {Promise<Array>} Array of all video files
 */
async function fetchAllVideoFiles(baseUrl, token) {
  const allVideoFiles = [];
  let skip = 0;
  const limit = 100;

  while (true) {
    const response = await axios.get(
      `${baseUrl}/api/v1/video-files`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { skip, limit }
      }
    );

    const { data, pagination } = response.data;
    allVideoFiles.push(...data);

    console.log(chalk.gray(`  Fetched ${allVideoFiles.length}/${pagination.total} video files`));

    // Check if there are more results
    if (skip + limit >= pagination.total) {
      break;
    }

    skip += limit;
  }

  return allVideoFiles;
}

/**
 * Fetch all media descriptions with pagination
 * @param {string} baseUrl - Backend base URL
 * @param {string} token - JWT token
 * @returns {Promise<Array>} Array of all media descriptions
 */
async function fetchAllMediaDescriptions(baseUrl, token) {
  const allMediaDescs = [];
  let skip = 0;
  const limit = 100;

  while (true) {
    const response = await axios.get(
      `${baseUrl}/api/v1/media-descriptions`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { skip, limit }
      }
    );

    const { data, pagination } = response.data;
    allMediaDescs.push(...data);

    console.log(chalk.gray(`  Fetched ${allMediaDescs.length}/${pagination.total} media descriptions`));

    // Check if there are more results
    if (skip + limit >= pagination.total) {
      break;
    }

    skip += limit;
  }

  return allMediaDescs;
}

/**
 * Check subtitle status for Mux asset (silent version for bulk operations)
 * @param {string} assetId - Mux asset ID
 * @param {Object} muxConfig - Mux configuration
 * @returns {Promise<Object>} Subtitle status result
 */
async function checkSubtitleStatusSilent(assetId, muxConfig) {
  const mux = new Mux({
    tokenId: muxConfig.tokenId,
    tokenSecret: muxConfig.tokenSecret
  });

  try {
    const asset = await mux.video.assets.retrieve(assetId);

    const result = {
      assetId: assetId,
      assetStatus: asset.status,
      subtitles: {
        en: { status: 'missing' },
        fr: { status: 'missing' },
        ko: { status: 'missing' }
      },
      playbackPolicies: []
    };

    // Parse tracks
    if (asset.tracks && asset.tracks.length > 0) {
      const textTracks = asset.tracks.filter(track =>
        track.type === 'text' && track.text_type === 'subtitles'
      );

      for (const lang of ['en', 'fr', 'ko']) {
        const track = textTracks.find(t => t.language_code === lang);

        if (track) {
          let status = 'valid';
          if (track.status === 'errored') {
            status = 'errored';
          } else if (track.status === 'preparing') {
            status = 'processing';
          } else if (track.status === 'ready') {
            status = 'valid';
          }

          result.subtitles[lang] = {
            status: status,
            trackId: track.id,
            name: track.name,
            trackStatus: track.status
          };

          if (track.status === 'errored' && track.error) {
            result.subtitles[lang].error = {
              type: track.error.type,
              messages: track.error.messages || []
            };
          }
        }
      }
    }

    // Extract playback policies
    if (asset.playback_ids && asset.playback_ids.length > 0) {
      asset.playback_ids.forEach(playbackId => {
        result.playbackPolicies.push({
          id: playbackId.id,
          policy: playbackId.policy
        });
      });
    }

    return result;
  } catch (error) {
    return {
      assetId: assetId,
      error: error.message,
      subtitles: {
        en: { status: 'error' },
        fr: { status: 'error' },
        ko: { status: 'error' }
      }
    };
  }
}

/**
 * List all video files with their subtitle status
 * @param {Object} config - Full configuration object
 * @param {number} limit - Optional limit for testing (process only first N files)
 * @returns {Promise<string>} JSON string of all results
 */
async function listAllVideoFilesWithSubtitleStatus(config, limit = null) {
  console.log(chalk.bold.cyan('\n=== Fetching All Video Files ==='));

  // 1. Authenticate
  console.log(chalk.cyan('\nAuthenticating with backend...'));
  const token = await authenticateBackend(config.backend);
  console.log(chalk.green('✓ Authenticated successfully'));

  // 2. Fetch all video files
  console.log(chalk.cyan('\nFetching video files...'));
  let videoFiles = await fetchAllVideoFiles(config.backend.baseUrl, token);

  // Apply limit if specified (for testing)
  if (limit && limit > 0) {
    console.log(chalk.yellow(`  ⚠ Limiting to first ${limit} video files for testing`));
    videoFiles = videoFiles.slice(0, limit);
  }

  console.log(chalk.green(`✓ Will process ${videoFiles.length} video files`));

  // 3. Fetch all media descriptions
  console.log(chalk.cyan('\nFetching media descriptions...'));
  const mediaDescriptions = await fetchAllMediaDescriptions(config.backend.baseUrl, token);
  console.log(chalk.green(`✓ Fetched ${mediaDescriptions.length} media descriptions`));

  // Create lookup map for media descriptions
  const mediaDescMap = new Map();
  mediaDescriptions.forEach(md => {
    if (md.main_video_file_id) {
      mediaDescMap.set(md.main_video_file_id, md);
    }
  });

  // 4. Process each video file
  console.log(chalk.bold.cyan('\n=== Processing Video Files ==='));
  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < videoFiles.length; i++) {
    const videoFile = videoFiles[i];
    const progress = `${i + 1}/${videoFiles.length}`;
    const percentage = ((i + 1) / videoFiles.length * 100).toFixed(1);

    // Calculate ETA
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    const avgTimePerFile = elapsed / (i + 1);
    const remaining = (videoFiles.length - i - 1) * avgTimePerFile;
    const etaMinutes = Math.floor(remaining / 60);
    const etaSeconds = Math.floor(remaining % 60);
    const eta = `${etaMinutes}m ${etaSeconds}s`;

    console.log(chalk.cyan(`\nProcessing ${progress} (${percentage}%) - ETA: ${eta}`));
    console.log(chalk.gray(`  Video File: ${videoFile.file_name || videoFile.id}`));

    // Get media description
    const mediaDesc = mediaDescMap.get(videoFile.id);

    const result = {
      videoFileId: videoFile.id,
      videoFileName: videoFile.file_name,
      muxAssetId: videoFile.mux_asset_id,
      mediaDescription: mediaDesc ? {
        id: mediaDesc.id,
        title: mediaDesc.episode_title
      } : null,
      subtitleStatus: null
    };

    // Check Mux subtitle status if asset ID exists
    if (videoFile.mux_asset_id) {
      console.log(chalk.gray(`  Checking Mux asset: ${videoFile.mux_asset_id}`));
      try {
        result.subtitleStatus = await checkSubtitleStatusSilent(
          videoFile.mux_asset_id,
          config.mux
        );

        // Log subtitle status summary
        const enStatus = result.subtitleStatus.subtitles.en.status;
        const frStatus = result.subtitleStatus.subtitles.fr.status;
        const koStatus = result.subtitleStatus.subtitles.ko.status;
        console.log(chalk.gray(`  Subtitles: EN=${enStatus}, FR=${frStatus}, KO=${koStatus}`));

      } catch (error) {
        console.log(chalk.yellow(`  ⚠ Error checking subtitles: ${error.message}`));
        result.subtitleStatus = { error: error.message };
      }

      // Wait 2 seconds before next Mux API call (rate limiting)
      if (i < videoFiles.length - 1) {
        console.log(chalk.gray(`  Waiting 2 seconds (rate limit)...`));
        await sleep(2000);
      }
    } else {
      console.log(chalk.gray(`  No Mux asset ID - skipping subtitle check`));
      result.subtitleStatus = { status: 'no_asset' };
    }

    results.push(result);
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(chalk.green(`\n✓ Processed all ${videoFiles.length} video files in ${totalTime} minutes`));

  return JSON.stringify(results, null, 2);
}

/**
 * Export results to Excel file
 * @param {string} jsonData - JSON string of results
 * @param {string} outputPath - Output file path
 * @returns {Promise<string>} Path to created file
 */
async function exportToExcel(jsonData, outputPath) {
  console.log(chalk.cyan('\n=== Exporting to Excel ==='));

  const data = JSON.parse(jsonData);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Subtitle Status');

  // Define columns
  worksheet.columns = [
    { header: 'Video File ID', key: 'videoFileId', width: 40 },
    { header: 'Video File Name', key: 'videoFileName', width: 50 },
    { header: 'Mux Asset ID', key: 'muxAssetId', width: 40 },
    { header: 'Media Description ID', key: 'mediaDescId', width: 40 },
    { header: 'Media Description Title', key: 'mediaDescTitle', width: 50 },
    { header: 'EN Status', key: 'enStatus', width: 15 },
    { header: 'EN Track ID', key: 'enTrackId', width: 40 },
    { header: 'EN Error', key: 'enError', width: 80 },
    { header: 'FR Status', key: 'frStatus', width: 15 },
    { header: 'FR Track ID', key: 'frTrackId', width: 40 },
    { header: 'FR Error', key: 'frError', width: 80 },
    { header: 'KO Status', key: 'koStatus', width: 15 },
    { header: 'KO Track ID', key: 'koTrackId', width: 40 },
    { header: 'KO Error', key: 'koError', width: 80 }
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };

  // Add data rows
  data.forEach(item => {
    const row = {
      videoFileId: item.videoFileId || '',
      videoFileName: item.videoFileName || '',
      muxAssetId: item.muxAssetId || '',
      mediaDescId: item.mediaDescription?.id || '',
      mediaDescTitle: item.mediaDescription?.title || '',
      enStatus: item.subtitleStatus?.subtitles?.en?.status || '',
      enTrackId: item.subtitleStatus?.subtitles?.en?.trackId || '',
      enError: item.subtitleStatus?.subtitles?.en?.error ?
        JSON.stringify(item.subtitleStatus.subtitles.en.error) : '',
      frStatus: item.subtitleStatus?.subtitles?.fr?.status || '',
      frTrackId: item.subtitleStatus?.subtitles?.fr?.trackId || '',
      frError: item.subtitleStatus?.subtitles?.fr?.error ?
        JSON.stringify(item.subtitleStatus.subtitles.fr.error) : '',
      koStatus: item.subtitleStatus?.subtitles?.ko?.status || '',
      koTrackId: item.subtitleStatus?.subtitles?.ko?.trackId || '',
      koError: item.subtitleStatus?.subtitles?.ko?.error ?
        JSON.stringify(item.subtitleStatus.subtitles.ko.error) : ''
    };

    worksheet.addRow(row);
  });

  // Save file
  await workbook.xlsx.writeFile(outputPath);
  console.log(chalk.green(`✓ Excel file saved: ${outputPath}`));

  return outputPath;
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);

    // Check for flags
    const hasListAll = args.includes('--list-all');
    const exportExcelIndex = args.indexOf('--export-excel');
    const hasExportExcel = exportExcelIndex !== -1;
    const excelPath = hasExportExcel ? args[exportExcelIndex + 1] : null;
    const limitIndex = args.indexOf('--limit');
    const hasLimit = limitIndex !== -1;
    const limit = hasLimit ? parseInt(args[limitIndex + 1], 10) : null;

    console.log(chalk.bold.cyan('\n=== Mux Subtitle Debug Tool ==='));

    // Load configuration
    console.log(chalk.cyan('\nLoading configuration from goodconfig.ini...'));
    const config = await loadConfig();
    console.log(chalk.green('✓ Configuration loaded'));

    // Mode 1: List all video files with subtitle status
    if (hasListAll) {
      const jsonResult = await listAllVideoFilesWithSubtitleStatus(config, limit);

      // Output JSON result
      console.log(chalk.bold.cyan('\n=== JSON Result ==='));
      console.log(jsonResult);

      // Export to Excel if requested
      if (hasExportExcel) {
        if (!excelPath) {
          throw new Error('--export-excel requires an output file path');
        }
        await exportToExcel(jsonResult, excelPath);
      }

      console.log(chalk.green('\n✓ Operation completed successfully\n'));
    }
    // Mode 2: Check single asset (original functionality)
    else {
      // Use provided asset ID or default test asset (error case)
      const assetId = args[0] || 'O78lCQLR1yamZBqshazGgtkGj7EDySG02WPYFfPOQVVY';

      // Check subtitle status
      const result = await checkSubtitleStatus(assetId, config);

      // Output JSON result
      console.log(chalk.bold.cyan('\n=== JSON Result ==='));
      console.log(JSON.stringify(result, null, 2));

      console.log(chalk.green('\n✓ Check completed successfully\n'));
    }

  } catch (error) {
    console.error(chalk.red('\n✗ Check failed:'), error.message);
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

// Run the tool
main();
