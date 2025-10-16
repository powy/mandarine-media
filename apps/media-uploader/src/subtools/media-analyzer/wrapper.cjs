// CommonJS wrapper for media-analyzer
const fs = require('fs').promises;
const MediaAnalyzer = require('./index.js');
const Config = require('./config.js');

// Dynamic import for file logger (ESM module)
let createFileLogger, redirectConsoleToLogger;
(async () => {
  const fileLoggerModule = await import('../../shared/utils/fileLogger.js');
  createFileLogger = fileLoggerModule.createFileLogger;
  redirectConsoleToLogger = fileLoggerModule.redirectConsoleToLogger;
})();

/**
 * Media Analyzer Function Wrapper
 * @param {Object} options - Analysis options
 * @param {string} options.videoPath - Path to video folder
 * @param {string} options.subtitlePath - Path to subtitle folder
 * @param {string} options.imagePath - Path to image folder
 * @param {string} options.output - Output file path
 * @param {boolean} options.verbose - Verbose mode
 * @param {number} options.minScore - Minimum association score
 * @param {boolean} options.noMetadata - Skip metadata reading
 * @param {boolean} options.exportForUpload - Export format optimized for upload
 * @param {string} [options.logFile] - Optional log file path for capturing all output
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeMedia(options) {
  let restoreConsole = null;

  // Initialize file logger if logFile is provided
  if (options.logFile && createFileLogger) {
    const logger = createFileLogger({
      logFile: options.logFile,
      verbose: options.verbose,
      quiet: false
    });
    restoreConsole = redirectConsoleToLogger(logger);
  }

  try {
    // Determine if using new multi-path mode or legacy single path
    let analyzePaths;
    if (options.videoPath || options.subtitlePath || options.imagePath) {
      // New multi-path mode
      analyzePaths = {
        videoPath: options.videoPath,
        subtitlePath: options.subtitlePath,
        imagePath: options.imagePath
      };

      if (!options.videoPath && !options.subtitlePath && !options.imagePath) {
        throw new Error('At least one path must be specified when using separate folder options');
      }
    } else if (options.path) {
      // Legacy single path mode
      analyzePaths = options.path;
    } else {
      throw new Error('You must specify either a single path or use the separate folder options');
    }

    // Create configuration
    const config = {
      minScore: options.minScore || 60,
      readMetadata: !options.noMetadata,
      exportForUpload: options.exportForUpload || false,
      verbose: options.verbose || false
    };

    // Create analyzer instance
    const analyzer = new MediaAnalyzer(config);

    // Run analysis
    const results = await analyzer.analyze(analyzePaths);

    // Export results if output file specified
    if (options.output) {
      await fs.writeFile(options.output, JSON.stringify(results, null, 2));
      console.log(`✅ Results exported to: ${options.output}`);
    }

    return results;

  } catch (error) {
    console.error('❌ Media analysis failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    throw error;
  } finally {
    // Restore console if redirected
    if (restoreConsole) {
      restoreConsole();
    }
  }
}

module.exports = { analyzeMedia };
