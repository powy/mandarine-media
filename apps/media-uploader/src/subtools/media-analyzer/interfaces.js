/**
 * Media Analyzer - All Three Interfaces
 * Provides core, INI, and CLI interfaces for the media analyzer tool
 */

// Import core functions
import { mediaAnalyzerCore, mediaAnalyzerCoreWithSave } from './core.js';

// Import INI interface
import {
  mediaAnalyzerFromIni,
  mediaAnalyzerFromIniSinglePath,
  mediaAnalyzerFromIniMultiPath,
  mediaAnalyzerFromIniAndSave,
} from './iniInterface.js';

// Import existing CLI for programmatic usage
import { main as cliMain, MediaAnalyzer, Config } from './cli.js';

// CLI options mapping for programmatic CLI usage
const CLI_MAPPING = {
  'videoPath': 'paths.videoPath',
  'subtitlePath': 'paths.subtitlePath',
  'imagePath': 'paths.imagePath',
  'output': 'outputFile',
  'minScore': 'minScore',
  'exportForUpload': 'exportForUpload',
};

/**
 * Execute media analyzer from CLI options object
 * @param {Object} cliOptions - CLI options object
 * @returns {Promise<Object>} Analysis result
 */
async function mediaAnalyzerFromCli(cliOptions) {
  try {
    // Determine paths
    let paths;
    if (cliOptions.videoPath || cliOptions.subtitlePath || cliOptions.imagePath) {
      // Multi-path mode
      paths = {
        videoPath: cliOptions.videoPath,
        subtitlePath: cliOptions.subtitlePath,
        imagePath: cliOptions.imagePath,
      };
    } else if (cliOptions.path) {
      // Legacy single path mode
      paths = cliOptions.path;
    } else {
      throw new Error('Either path or one of videoPath/subtitlePath/imagePath must be specified');
    }

    // Build core configuration
    const coreConfig = {
      paths,
      readMetadata: cliOptions.metadata !== false,
      minScore: cliOptions.minScore,
      verbose: cliOptions.verbose || false,
      debug: cliOptions.debug || false,
      outputFile: cliOptions.output,
      exportForUpload: cliOptions.exportForUpload || false,
    };

    // Execute core function with save if output file is specified
    if (cliOptions.output || cliOptions.saveToFile) {
      return await mediaAnalyzerCoreWithSave(coreConfig);
    } else {
      const result = await mediaAnalyzerCore(coreConfig);
      return { result };
    }

  } catch (error) {
    throw new Error(`Media Analyzer CLI execution failed: ${error.message}`);
  }
}

/**
 * Media Analyzer Interface Object
 * Provides all three interfaces in a single object
 */
export const MediaAnalyzerInterface = {
  // Core interface - pure function accepting JSON config
  core: mediaAnalyzerCore,
  coreWithSave: mediaAnalyzerCoreWithSave,

  // INI interface - reads INI file and converts to JSON for core
  fromIni: mediaAnalyzerFromIni,
  fromIniSinglePath: mediaAnalyzerFromIniSinglePath,
  fromIniMultiPath: mediaAnalyzerFromIniMultiPath,
  fromIniAndSave: mediaAnalyzerFromIniAndSave,

  // CLI interface - accepts CLI options object
  fromCli: mediaAnalyzerFromCli,

  // Legacy interfaces for backward compatibility
  legacy: {
    MediaAnalyzer,
    Config,
    cliMain,
  },
};

// Export individual functions for convenience
export {
  // Core interfaces
  mediaAnalyzerCore,
  mediaAnalyzerCoreWithSave,

  // INI interfaces
  mediaAnalyzerFromIni,
  mediaAnalyzerFromIniSinglePath,
  mediaAnalyzerFromIniMultiPath,
  mediaAnalyzerFromIniAndSave,

  // CLI interface
  mediaAnalyzerFromCli,

  // Legacy classes
  MediaAnalyzer,
  Config,
};

// Default export
export default MediaAnalyzerInterface;