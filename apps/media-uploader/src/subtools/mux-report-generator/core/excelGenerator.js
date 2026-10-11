/**
 * Excel Generator
 * Creates Excel file with Mux asset report data
 */

import ExcelJS from 'exceljs';
import { REPORT_CONFIG } from '../config/constants.js';

export class ExcelGenerator {
  /**
   * Create a new Excel Generator
   * @param {Object} logger - Logger instance
   */
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Extract playback URL for a specific policy type
   * @param {Array} playbackIds - Array of playback ID objects
   * @param {string} policy - Playback policy type ('public', 'signed', 'drm')
   * @returns {string} Playback URL or empty string
   */
  extractPlaybackUrl(playbackIds, policy) {
    if (!playbackIds || !Array.isArray(playbackIds)) {
      return '';
    }

    // Find playback ID with matching policy
    const playbackId = playbackIds.find(pid => pid.policy === policy);

    if (!playbackId || !playbackId.id) {
      return '';
    }

    // Generate Mux streaming URL
    return `https://stream.mux.com/${playbackId.id}.m3u8`;
  }

  /**
   * Format creation date for Excel
   * @param {string} createdAt - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(createdAt) {
    if (!createdAt) {
      return '';
    }

    try {
      const date = new Date(createdAt);
      // Format as YYYY-MM-DD HH:mm:ss
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      this.logger.warn(`Failed to parse date ${createdAt}: ${error.message}`);
      return createdAt; // Return original string if parsing fails
    }
  }

  /**
   * Generate Excel workbook with asset data
   * @param {Array} assets - Array of Mux asset objects
   * @param {Object} subtitleAnalysis - Map of asset ID to subtitle analysis
   * @returns {Promise<ExcelJS.Workbook>} Generated workbook
   */
  async generate(assets, subtitleAnalysis) {
    this.logger.info(`Generating Excel report for ${assets.length} assets...`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(REPORT_CONFIG.EXCEL.SHEET_NAME);

    // Define columns
    worksheet.columns = REPORT_CONFIG.EXCEL.COLUMNS;

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = REPORT_CONFIG.EXCEL.HEADER_STYLE.font;
    headerRow.fill = REPORT_CONFIG.EXCEL.HEADER_STYLE.fill;

    // Add data rows
    assets.forEach((asset, index) => {
      const analysis = subtitleAnalysis[asset.id] || {};

      worksheet.addRow({
        fileName: asset.input_info?.file_name || asset.id,
        status: asset.status || 'unknown',
        frSubtitle: analysis.fr || 'unknown',
        enSubtitle: analysis.en || 'unknown',
        koSubtitle: analysis.ko || 'unknown',
        publicUrl: this.extractPlaybackUrl(asset.playback_ids, REPORT_CONFIG.PLAYBACK_POLICIES.PUBLIC),
        signedUrl: this.extractPlaybackUrl(asset.playback_ids, REPORT_CONFIG.PLAYBACK_POLICIES.SIGNED),
        drmUrl: this.extractPlaybackUrl(asset.playback_ids, REPORT_CONFIG.PLAYBACK_POLICIES.DRM),
        assetId: asset.id,
        createdAt: this.formatDate(asset.created_at)
      });

      // Log progress every 100 assets
      if ((index + 1) % 100 === 0) {
        this.logger.info(`Added ${index + 1}/${assets.length} rows to Excel`);
      }
    });

    // Freeze header row
    worksheet.views = [
      { state: 'frozen', ySplit: 1 }
    ];

    this.logger.info(`Excel generation completed: ${assets.length} data rows`);
    return workbook;
  }

  /**
   * Save workbook to file
   * @param {ExcelJS.Workbook} workbook - Workbook to save
   * @param {string} filePath - Full file path
   * @returns {Promise<void>}
   */
  async save(workbook, filePath) {
    this.logger.info(`Saving Excel file to: ${filePath}`);

    try {
      await workbook.xlsx.writeFile(filePath);
      this.logger.info('Excel file saved successfully');
    } catch (error) {
      this.logger.error(`Failed to save Excel file: ${error.message}`);
      throw new Error(`Failed to save Excel file to ${filePath}: ${error.message}`);
    }
  }
}

export default ExcelGenerator;
