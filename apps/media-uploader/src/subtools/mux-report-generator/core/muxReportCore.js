/**
 * Mux Report Core
 * Main orchestration logic for Mux asset report generation
 */

import { MuxApiClient } from './muxApiClient.js';
import { SubtitleAnalyzer } from './subtitleAnalyzer.js';
import { ExcelGenerator } from './excelGenerator.js';
import { OutputPathResolver } from './outputPathResolver.js';

/**
 * Create a simple logger if none provided
 * @returns {Object} Logger object
 */
function createDefaultLogger() {
  return {
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
  };
}

/**
 * Generate Mux asset report
 * @param {Object} config - Configuration object
 * @param {Object} options - Options
 * @param {Object} options.logger - Logger instance
 * @param {Function} options.progressCallback - Progress callback
 * @param {boolean} options.verbose - Verbose logging
 * @returns {Promise<Object>} Result object
 */
export async function generateMuxReport(config, options = {}) {
  const logger = options.logger || createDefaultLogger();
  const progressCallback = options.progressCallback || (() => {});

  try {
    logger.info('=== Starting Mux Asset Report Generation ===');

    // Validate Mux configuration
    if (!config.mux || !config.mux.tokenId || !config.mux.tokenSecret) {
      throw new Error('Mux configuration is missing. Please ensure tokenId and tokenSecret are provided.');
    }

    // Phase 1: Initialize Mux API client
    logger.info('Phase 1: Initializing Mux API client...');
    const muxClient = new MuxApiClient(
      config.mux.tokenId,
      config.mux.tokenSecret,
      logger
    );

    // Phase 2: Fetch all assets with pagination
    logger.info('Phase 2: Fetching all Mux assets...');
    const assets = await muxClient.listAllAssets((progress) => {
      logger.info(`Fetched ${progress.count} assets (Page ${progress.page})...`);
      progressCallback({
        phase: 'fetching',
        current: progress.count,
        message: `Fetched ${progress.count} assets`
      });
    });

    logger.info(`Total assets fetched: ${assets.length}`);

    // Handle edge case: no assets
    if (assets.length === 0) {
      logger.warn('No assets found in Mux account. Generating empty report.');
    }

    // Phase 3: Analyze subtitle tracks
    logger.info('Phase 3: Analyzing subtitle tracks...');
    const subtitleAnalyzer = new SubtitleAnalyzer(logger);
    const subtitleAnalysis = subtitleAnalyzer.analyzeAll(assets, (progress) => {
      progressCallback({
        phase: 'analyzing',
        current: progress.current,
        total: progress.total,
        message: `Analyzed ${progress.current}/${progress.total} assets`
      });
    });

    // Phase 4: Generate Excel workbook
    logger.info('Phase 4: Generating Excel report...');
    const excelGenerator = new ExcelGenerator(logger);
    const workbook = await excelGenerator.generate(assets, subtitleAnalysis);

    progressCallback({
      phase: 'generating',
      message: 'Excel workbook generated'
    });

    // Phase 5: Resolve output path
    logger.info('Phase 5: Resolving output path...');
    const pathResolver = new OutputPathResolver(logger);
    const outputPath = await pathResolver.resolve();

    logger.info(`Output path resolved: ${outputPath}`);

    // Phase 6: Save Excel file
    logger.info('Phase 6: Saving Excel file...');
    await excelGenerator.save(workbook, outputPath);

    progressCallback({
      phase: 'saving',
      message: 'Report saved successfully'
    });

    // Success!
    logger.info('=== Report Generation Completed Successfully ===');
    logger.info(`Asset count: ${assets.length}`);
    logger.info(`Output file: ${outputPath}`);

    return {
      success: true,
      outputPath: outputPath,
      assetCount: assets.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Report generation failed: ${error.message}`);
    logger.error(error.stack);

    return {
      success: false,
      error: error.message,
      phase: 'unknown',
      timestamp: new Date().toISOString()
    };
  }
}

export default generateMuxReport;
