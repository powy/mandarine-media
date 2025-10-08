/**
 * Media Uploader Tool Interfaces
 * Main aggregator for all subtool interfaces
 */

// Import all subtool interfaces
import { MediaAnalyzerInterface } from '../subtools/media-analyzer/interfaces.js';
import { MuxUploadInterface } from '../subtools/mux-upload/interfaces.js';
import { PictureUploadInterface } from '../subtools/picture-upload/interfaces.js';

// For tools not yet refactored, create placeholder interfaces
const createLegacyInterface = (toolName) => ({
  core: () => { throw new Error(`${toolName} core interface not yet implemented`); },
  fromIni: () => { throw new Error(`${toolName} INI interface not yet implemented`); },
  fromCli: () => { throw new Error(`${toolName} CLI interface not yet implemented`); },
  legacy: {},
});

/**
 * Main Media Uploader Interface
 * Provides access to all subtool interfaces
 */
export const MediaUploaderInterfaces = {
  // Refactored tools with full three-interface support
  mediaAnalyzer: MediaAnalyzerInterface,
  muxUpload: MuxUploadInterface,
  pictureUpload: PictureUploadInterface,

  // Tools awaiting refactoring (placeholder interfaces)
  muxSubtitleUpload: createLegacyInterface('MuxSubtitleUpload'),
  oneMediaCompleteUpload: createLegacyInterface('OneMediaCompleteUpload'),
  excelBatchEditor: createLegacyInterface('ExcelBatchEditor'),
  uploadGui: createLegacyInterface('UploadGui'),
};

/**
 * Helper function to execute a tool with specified interface
 * @param {string} toolName - Name of the tool
 * @param {string} interfaceType - Interface type: 'core', 'fromIni', or 'fromCli'
 * @param {...any} args - Arguments to pass to the interface method
 * @returns {Promise<any>} Tool execution result
 */
export async function executeTool(toolName, interfaceType, ...args) {
  const tool = MediaUploaderInterfaces[toolName];
  if (!tool) {
    throw new Error(`Tool '${toolName}' not found. Available tools: ${Object.keys(MediaUploaderInterfaces).join(', ')}`);
  }

  const interfaceMethod = tool[interfaceType];
  if (!interfaceMethod) {
    throw new Error(`Interface '${interfaceType}' not found for tool '${toolName}'. Available interfaces: ${Object.keys(tool).join(', ')}`);
  }

  return await interfaceMethod(...args);
}

/**
 * Batch execution helper for running multiple tools with the same INI file
 * @param {string} iniFilePath - Path to INI configuration file
 * @param {Array<Object>} toolConfigs - Array of tool configurations
 * @param {string} toolConfigs.tool - Tool name
 * @param {string} toolConfigs.method - Method name (e.g., 'fromIni', 'fromIniWithPath')
 * @param {Array} toolConfigs.args - Arguments to pass to the method
 * @returns {Promise<Array>} Array of results
 */
export async function executeBatchFromIni(iniFilePath, toolConfigs) {
  const results = [];

  for (const { tool, method = 'fromIni', args = [] } of toolConfigs) {
    try {
      const result = await executeTool(tool, method, iniFilePath, ...args);
      results.push({
        tool,
        success: true,
        result,
      });
    } catch (error) {
      results.push({
        tool,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Get available tools and their interface methods
 * @returns {Object} Object with tool names as keys and available interfaces as values
 */
export function getAvailableTools() {
  const tools = {};

  for (const [toolName, toolInterface] of Object.entries(MediaUploaderInterfaces)) {
    tools[toolName] = {
      interfaces: Object.keys(toolInterface).filter(key => typeof toolInterface[key] === 'function'),
      description: getToolDescription(toolName),
    };
  }

  return tools;
}

/**
 * Get tool description
 * @param {string} toolName - Tool name
 * @returns {string} Tool description
 */
function getToolDescription(toolName) {
  const descriptions = {
    mediaAnalyzer: 'Analyze and associate video, subtitle, and image files',
    muxUpload: 'Upload videos to Mux platform with enhanced chunked upload',
    pictureUpload: 'Upload pictures to S3 and create records in backend API',
    muxSubtitleUpload: 'Upload subtitles to Mux platform',
    oneMediaCompleteUpload: 'Complete media upload workflow orchestration',
    excelBatchEditor: 'Edit Excel batch files for media uploads',
    uploadGui: 'GUI interface for media upload operations',
  };

  return descriptions[toolName] || 'Description not available';
}

// Export individual tool interfaces for direct import
export {
  MediaAnalyzerInterface,
  MuxUploadInterface,
  PictureUploadInterface,
};

// Default export
export default MediaUploaderInterfaces;