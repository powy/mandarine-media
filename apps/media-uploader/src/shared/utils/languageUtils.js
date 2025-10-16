/**
 * Shared Language Utilities
 * Centralized language detection, validation, and processing functions
 * Used across multiple tools: mux-subtitle-upload, one-media-complete-upload, media-analyzer
 */

/**
 * Detect language from subtitle filename using common patterns
 * Extracted from MediaAnalysisService for reuse across tools
 * @param {string} fileName - The subtitle filename
 * @returns {string|null} - Detected language code (fr, en, ko) or null if not detected
 */
export function detectLanguageFromFilename(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }

  const lowerFileName = fileName.toLowerCase();

  // Detect language from filename - expanded patterns
  // French patterns
  if (lowerFileName.startsWith('fr ') || lowerFileName.startsWith('fr_') || lowerFileName.startsWith('fr-') ||
      lowerFileName.includes('_fr') || lowerFileName.includes('-fr') ||
      lowerFileName.includes('.fr') || lowerFileName.includes(' fr ') ||
      lowerFileName.endsWith(' fr.srt') || lowerFileName.endsWith(' fr.vtt') ||
      lowerFileName.includes('[fr]') || lowerFileName.includes('(fr)')) {
    return 'fr';
  }

  // English patterns (supporting both 'en' and 'eng')
  if (lowerFileName.startsWith('en ') || lowerFileName.startsWith('en_') || lowerFileName.startsWith('en-') ||
      lowerFileName.startsWith('eng ') || lowerFileName.startsWith('eng_') || lowerFileName.startsWith('eng-') ||
      lowerFileName.includes('_en') || lowerFileName.includes('-en') ||
      lowerFileName.includes('.en') || lowerFileName.includes(' en ') ||
      lowerFileName.endsWith(' en.srt') || lowerFileName.endsWith(' en.vtt') ||
      lowerFileName.includes('[en]') || lowerFileName.includes('(en)') ||
      lowerFileName.includes('_eng') || lowerFileName.includes('-eng') ||
      lowerFileName.includes('.eng') || lowerFileName.includes(' eng ') ||
      lowerFileName.endsWith(' eng.srt') || lowerFileName.endsWith(' eng.vtt') ||
      lowerFileName.includes('[eng]') || lowerFileName.includes('(eng)')) {
    return 'en';
  }

  // Korean patterns (supporting both ko and kr variants)
  if (lowerFileName.startsWith('ko ') || lowerFileName.startsWith('ko_') || lowerFileName.startsWith('ko-') ||
      lowerFileName.startsWith('kr ') || lowerFileName.startsWith('kr_') || lowerFileName.startsWith('kr-') ||
      lowerFileName.includes('_ko') || lowerFileName.includes('-ko') ||
      lowerFileName.includes('.ko') || lowerFileName.includes(' ko ') ||
      lowerFileName.endsWith(' ko.srt') || lowerFileName.endsWith(' ko.vtt') ||
      lowerFileName.includes('_kr') || lowerFileName.includes('-kr') ||
      lowerFileName.includes('.kr') || lowerFileName.includes(' kr ') ||
      lowerFileName.endsWith(' kr.srt') || lowerFileName.endsWith(' kr.vtt') ||
      lowerFileName.includes('[ko]') || lowerFileName.includes('(ko)') ||
      lowerFileName.includes('[kr]') || lowerFileName.includes('(kr)')) {
    return 'ko';  // Map both ko and kr to 'ko'
  }

  return null;
}

/**
 * Remove language patterns from filename for better matching
 * Extracted from OrchestrationService for reuse
 * @param {string} fileName - The filename to clean
 * @returns {string} - Filename with language patterns removed
 */
export function removeLanguageFromFilename(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return fileName;
  }

  let cleanName = fileName.trim();

  // Remove file extension first if it's a subtitle
  cleanName = cleanName.replace(/\.(srt|vtt|ass|ssa|sub|sbv)$/i, '').trim();

  // Remove common language patterns
  cleanName = cleanName.replace(/[-_\s]+(fr|en|eng|ko|kr|FR|EN|ENG|KO|KR)$/i, ''); // Language suffix
  cleanName = cleanName.replace(/\s*[-_]\s*(fr|en|eng|ko|kr|FR|EN|ENG|KO|KR)$/i, ''); // Space-dash-language
  cleanName = cleanName.replace(/\s*\[(fr|en|eng|ko|kr|FR|EN|ENG|KO|KR)\]/i, ''); // [language] brackets
  cleanName = cleanName.replace(/\s*\((fr|en|eng|ko|kr|FR|EN|ENG|KO|KR)\)/i, ''); // (language) parentheses

  return cleanName.trim();
}

/**
 * Validate BCP 47 language code
 * Extracted from SubtitleService for reuse
 * @param {string} languageCode - The language code to validate
 * @returns {boolean} - True if valid BCP 47 format
 */
export function isValidBCP47(languageCode) {
  if (!languageCode || typeof languageCode !== 'string') {
    return false;
  }

  // Basic BCP 47 validation - checks for common patterns
  const bcp47Pattern = /^[a-z]{2,3}(-[A-Z]{2})?(-[a-z]{4})?(-[A-Z]{2})?$/;
  return bcp47Pattern.test(languageCode);
}

/**
 * Get language display name from ISO 639-1 code
 * Extracted from MuxManager for reuse
 * @param {string} code - Language code (en, fr, ko, etc.)
 * @returns {string} - Human-readable language name
 */
export function getLanguageDisplayName(code) {
  if (!code || typeof code !== 'string') {
    return 'Unknown';
  }

  const languages = {
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'it': 'Italiano',
    'pt': 'Português',
    'ru': 'Русский',
    'ja': '日本語',
    'ko': '한국어',
    'zh': '中文',
    'ar': 'العربية',
    'hi': 'हिन्दी',
    'tr': 'Türkçe',
    'pl': 'Polski',
    'nl': 'Nederlands',
    'sv': 'Svenska',
    'da': 'Dansk',
    'no': 'Norsk',
    'fi': 'Suomi',
    'he': 'עברית',
    'th': 'ไทย',
    'vi': 'Tiếng Việt',
    'cs': 'Čeština',
    'hu': 'Magyar',
    'ro': 'Română',
    'bg': 'български',
    'hr': 'Hrvatski',
    'sk': 'Slovenčina',
    'sl': 'Slovenščina',
    'et': 'Eesti',
    'lv': 'Latviešu',
    'lt': 'Lietuvių'
  };

  return languages[code.toLowerCase()] || code.toUpperCase();
}

/**
 * Normalize language code to standard format
 * @param {string} code - Language code that might need normalization
 * @returns {string} - Normalized language code
 */
export function normalizeLanguageCode(code) {
  if (!code || typeof code !== 'string') {
    return null;
  }

  const normalized = code.toLowerCase().trim();

  // Handle common variants
  const variants = {
    'kr': 'ko',     // Korean variants
    'korean': 'ko',
    'eng': 'en',    // English 3-letter code
    'english': 'en',
    'french': 'fr',
    'français': 'fr'
  };

  return variants[normalized] || normalized;
}

/**
 * Generate unique track name to avoid conflicts
 * Extracted from MuxManager for reuse
 * @param {string} languageCode - Language code for the track
 * @returns {string} - Unique track name
 */
export function generateUniqueTrackName(languageCode) {
  const baseName = getLanguageDisplayName(languageCode);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 5);
  return `${baseName}_${timestamp}_${randomSuffix}`;
}

/**
 * Extract all supported language patterns for pattern matching
 * @returns {Array<string>} - Array of supported language codes
 */
export function getSupportedLanguages() {
  return ['fr', 'en', 'ko'];
}

/**
 * Check if a language is supported by the detection system
 * @param {string} languageCode - Language code to check
 * @returns {boolean} - True if language is supported
 */
export function isLanguageSupported(languageCode) {
  const supported = getSupportedLanguages();
  const normalized = normalizeLanguageCode(languageCode);
  return supported.includes(normalized);
}

/**
 * Get all language patterns used for detection
 * Useful for testing and documentation
 * @returns {Object} - Object with language codes as keys and pattern arrays as values
 */
export function getLanguagePatterns() {
  return {
    fr: ['fr ', 'fr_', 'fr-', '_fr', '-fr', '.fr', ' fr ', '[fr]', '(fr)', ' fr.srt', ' fr.vtt'],
    en: ['en ', 'en_', 'en-', 'eng ', 'eng_', 'eng-', '_en', '-en', '.en', ' en ', '[en]', '(en)', ' en.srt', ' en.vtt',
         '_eng', '-eng', '.eng', ' eng ', '[eng]', '(eng)', ' eng.srt', ' eng.vtt'],
    ko: ['ko ', 'ko_', 'ko-', 'kr ', 'kr_', 'kr-', '_ko', '-ko', '.ko', ' ko ', '[ko]', '(ko)', ' ko.srt', ' ko.vtt',
         '_kr', '-kr', '.kr', ' kr ', '[kr]', '(kr)', ' kr.srt', ' kr.vtt']
  };
}