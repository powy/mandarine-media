/**
 * ES Module wrapper for media-analyzer
 * Bridges ES modules with the CommonJS media-analyzer code
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the CommonJS wrapper
const mediaAnalyzerCjs = require('./wrapper.cjs');

/**
 * Media Analyzer Function Wrapper (ES Module)
 * @param {Object} options - Analysis options
 * @param {string} options.videoPath - Path to video folder
 * @param {string} options.subtitlePath - Path to subtitle folder
 * @param {string} options.imagePath - Path to image folder
 * @param {string} options.output - Output file path
 * @param {boolean} options.verbose - Verbose mode
 * @param {number} options.minScore - Minimum association score
 * @param {boolean} options.noMetadata - Skip metadata reading
 * @param {boolean} options.exportForUpload - Export format optimized for upload
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeMedia(options) {
  return await mediaAnalyzerCjs.analyzeMedia(options);
}

// Export as default for compatibility
export default { analyzeMedia };
