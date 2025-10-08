/**
 * Format Detection Utility
 * Detects image format from dimensions and maps to media_description fields
 */

export class FormatDetector {
  constructor() {
    // The 5 established formats supported by the system
    this.supportedFormats = [
      '1920_1080', '1920_720', '1080_1080', '810_1080', '1080_1920'
    ];
  }

  /**
   * Detect format from image dimensions
   * @param {number} width - Image width in pixels
   * @param {number} height - Image height in pixels
   * @returns {Object} - Detection result with format or error
   */
  detectFormat(width, height) {
    if (!width || !height || width <= 0 || height <= 0) {
      return {
        success: false,
        error: 'Invalid dimensions: width and height must be positive numbers',
        width,
        height
      };
    }

    // Create format string from dimensions
    const detectedFormat = `${width}_${height}`;

    // Check if detected format is in our supported list
    if (this.supportedFormats.includes(detectedFormat)) {
      return {
        success: true,
        format: detectedFormat,
        width,
        height,
        mediaDescriptionField: `image_${detectedFormat}_id`,
        displayFormat: `${width}x${height}`
      };
    }

    // Format not supported - provide helpful error message
    const supportedDisplayFormats = this.supportedFormats.map(format =>
      format.replace('_', 'x')
    ).join(', ');

    return {
      success: false,
      error: `Image format ${width}x${height} is not supported. Supported formats: ${supportedDisplayFormats}`,
      detectedFormat: `${width}x${height}`,
      supportedFormats: this.supportedFormats,
      width,
      height
    };
  }

  /**
   * Get list of supported formats
   * @returns {Array} - Array of supported format strings
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Get display-friendly format list
   * @returns {Array} - Array of display format strings (e.g., "1920x1080")
   */
  getSupportedDisplayFormats() {
    return this.supportedFormats.map(format => format.replace('_', 'x'));
  }

  /**
   * Check if a format is supported
   * @param {string} format - Format string (e.g., "1920_1080" or "1920x1080")
   * @returns {boolean} - True if format is supported
   */
  isFormatSupported(format) {
    const normalizedFormat = format.replace('x', '_');
    return this.supportedFormats.includes(normalizedFormat);
  }

  /**
   * Get media_description field name for a format
   * @param {string} format - Format string (e.g., "1920_1080")
   * @returns {string} - Media description field name (e.g., "image_1920_1080_id")
   */
  getFieldName(format) {
    const normalizedFormat = format.replace('x', '_');
    if (!this.isFormatSupported(normalizedFormat)) {
      throw new Error(`Unsupported format: ${format}`);
    }
    return `image_${normalizedFormat}_id`;
  }
}

// Export singleton instance
export const formatDetector = new FormatDetector();

export default formatDetector;