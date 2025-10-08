/**
 * Language Detector Service
 * Detects language code from subtitle filenames
 */

/**
 * Detect language code from subtitle filename
 * Supports patterns:
 * - video_en.srt
 * - video.en.srt
 * - video_en_US.srt
 * - video.en-US.srt
 * - video_eng.srt
 *
 * @param {string} fileName - Subtitle filename
 * @returns {string|null} BCP 47 language code or null if not detected
 *
 * @example
 * detectLanguageFromFilename('movie_en.srt') // 'en'
 * detectLanguageFromFilename('movie.fr.vtt') // 'fr'
 * detectLanguageFromFilename('movie_en-US.srt') // 'en-US'
 * detectLanguageFromFilename('movie_eng.srt') // 'en'
 */
export function detectLanguageFromFilename(fileName) {
  // Remove extension
  const nameWithoutExt = fileName.replace(/\.(srt|vtt|sub|ssa|ass)$/i, '');

  // Pattern 1: _en, _fr, _ko (2-letter ISO 639-1)
  const pattern1 = /_([a-z]{2})$/i;
  const match1 = nameWithoutExt.match(pattern1);
  if (match1) return match1[1].toLowerCase();

  // Pattern 2: .en, .fr, .ko
  const pattern2 = /\.([a-z]{2})$/i;
  const match2 = nameWithoutExt.match(pattern2);
  if (match2) return match2[1].toLowerCase();

  // Pattern 3: _en-US, _fr-CA (with region)
  const pattern3 = /_([a-z]{2}-[A-Z]{2})$/;
  const match3 = nameWithoutExt.match(pattern3);
  if (match3) return match3[1];

  // Pattern 4: .en-US, .fr-CA (with region, dot separator)
  const pattern4 = /\.([a-z]{2}-[A-Z]{2})$/;
  const match4 = nameWithoutExt.match(pattern4);
  if (match4) return match4[1];

  // Pattern 5: _eng, _fra (3-letter ISO 639-2)
  const pattern5 = /_([a-z]{3})$/i;
  const match5 = nameWithoutExt.match(pattern5);
  if (match5) {
    // Convert ISO 639-2 to ISO 639-1 if possible
    return convertISO639_2to639_1(match5[1].toLowerCase());
  }

  // Pattern 6: .eng, .fra (3-letter ISO 639-2, dot separator)
  const pattern6 = /\.([a-z]{3})$/i;
  const match6 = nameWithoutExt.match(pattern6);
  if (match6) {
    return convertISO639_2to639_1(match6[1].toLowerCase());
  }

  return null;
}

/**
 * Convert ISO 639-2 (3-letter) to ISO 639-1 (2-letter)
 * @param {string} code - ISO 639-2 language code
 * @returns {string} ISO 639-1 language code or original if no mapping
 */
function convertISO639_2to639_1(code) {
  const mappings = {
    // Common languages
    'eng': 'en', // English
    'fra': 'fr', // French
    'fre': 'fr', // French (alternative)
    'spa': 'es', // Spanish
    'deu': 'de', // German
    'ger': 'de', // German (alternative)
    'ita': 'it', // Italian
    'por': 'pt', // Portuguese
    'rus': 'ru', // Russian
    'jpn': 'ja', // Japanese
    'kor': 'ko', // Korean
    'zho': 'zh', // Chinese
    'chi': 'zh', // Chinese (alternative)
    'ara': 'ar', // Arabic
    'hin': 'hi', // Hindi
    'ben': 'bn', // Bengali
    'nld': 'nl', // Dutch
    'dut': 'nl', // Dutch (alternative)
    'swe': 'sv', // Swedish
    'pol': 'pl', // Polish
    'tur': 'tr', // Turkish
    'vie': 'vi', // Vietnamese
    'tha': 'th', // Thai
    'ind': 'id', // Indonesian
    'msa': 'ms', // Malay
    'may': 'ms', // Malay (alternative)
    'ces': 'cs', // Czech
    'cze': 'cs', // Czech (alternative)
    'dan': 'da', // Danish
    'fin': 'fi', // Finnish
    'nor': 'no', // Norwegian
    'hun': 'hu', // Hungarian
    'ron': 'ro', // Romanian
    'rum': 'ro', // Romanian (alternative)
    'ukr': 'uk', // Ukrainian
    'ell': 'el', // Greek
    'gre': 'el', // Greek (alternative)
    'heb': 'he', // Hebrew
    'cat': 'ca', // Catalan
    'hrv': 'hr', // Croatian
    'slk': 'sk', // Slovak
    'slo': 'sk', // Slovak (alternative)
    'bul': 'bg', // Bulgarian
    'srp': 'sr', // Serbian
    'lit': 'lt', // Lithuanian
    'lav': 'lv', // Latvian
    'est': 'et', // Estonian
    'slv': 'sl'  // Slovenian
  };

  return mappings[code] || code;
}

/**
 * Validate if a language code is valid BCP 47 format
 * @param {string} code - Language code to validate
 * @returns {boolean} True if valid BCP 47 format
 */
export function isValidBCP47(code) {
  if (!code || typeof code !== 'string') {
    return false;
  }

  // Simple BCP 47 validation
  // Accepts: 'en', 'en-US', 'zh-Hans', etc.
  const bcp47Pattern = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?$/;
  return bcp47Pattern.test(code);
}

/**
 * Get display name for a language code
 * @param {string} code - Language code
 * @returns {string} Display name or code if unknown
 */
export function getLanguageDisplayName(code) {
  const displayNames = {
    'en': 'English',
    'en-US': 'English (United States)',
    'en-GB': 'English (United Kingdom)',
    'fr': 'French',
    'fr-FR': 'French (France)',
    'fr-CA': 'French (Canada)',
    'es': 'Spanish',
    'es-ES': 'Spanish (Spain)',
    'es-MX': 'Spanish (Mexico)',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'pt-BR': 'Portuguese (Brazil)',
    'pt-PT': 'Portuguese (Portugal)',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'pl': 'Polish',
    'tr': 'Turkish',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'id': 'Indonesian',
    'ms': 'Malay',
    'cs': 'Czech',
    'da': 'Danish',
    'fi': 'Finnish',
    'no': 'Norwegian',
    'hu': 'Hungarian',
    'ro': 'Romanian',
    'uk': 'Ukrainian',
    'el': 'Greek',
    'he': 'Hebrew',
    'ca': 'Catalan',
    'hr': 'Croatian',
    'sk': 'Slovak',
    'bg': 'Bulgarian',
    'sr': 'Serbian',
    'lt': 'Lithuanian',
    'lv': 'Latvian',
    'et': 'Estonian',
    'sl': 'Slovenian'
  };

  return displayNames[code] || code;
}

export default {
  detectLanguageFromFilename,
  isValidBCP47,
  getLanguageDisplayName
};
