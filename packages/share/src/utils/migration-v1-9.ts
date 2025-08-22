/**
 * Migration utilities for API v1.8 to v1.9
 * Provides data transformation functions to help with breaking changes
 */

// ===== DATA TRANSFORMATION UTILITIES =====

/**
 * Transform v1.8 MediaDescription data to v1.9 format
 */
export const migrateMediaDescriptionV18toV19 = (data: any): any => {
  const migrated = { ...data };

  // Field renames
  if ('human_keywords_text_list' in data) {
    migrated.tag_text_list = data.human_keywords_text_list;
    delete migrated.human_keywords_text_list;
  }

  if ('friendly_url' in data) {
    migrated.slug = data.friendly_url;
    delete migrated.friendly_url;
  }

  return migrated;
};

/**
 * Transform v1.8 ScreenContent data to v1.9 ScreenDescription format
 */
export const migrateScreenContentV18toV19 = (data: any): any => {
  // ScreenContent -> ScreenDescription (mostly compatible, just new slug field)
  const migrated = { ...data };

  // Generate slug from title if not provided
  if (data.title && !data.slug) {
    migrated.slug = generateSlugFromText(data.title);
  }

  return migrated;
};

/**
 * Transform v1.8 ContentList data to v1.9 format
 */
export const migrateContentListV18toV19 = (data: any): any => {
  const migrated = { ...data };

  // Add required latest_first field with default value
  if (!('latest_first' in data)) {
    migrated.latest_first = true;
  }

  // Generate slug from title if not provided
  if (data.title && !data.slug) {
    migrated.slug = generateSlugFromText(data.title);
  }

  return migrated;
};

/**
 * Transform v1.8 VideoFile data to v1.9 format
 */
export const migrateVideoFileV18toV19 = (data: any): any => {
  const migrated = { ...data };

  // Add new optional fields with defaults
  if (!('environment_key' in data)) {
    migrated.environment_key = '';
  }

  if (!('protection_key' in data)) {
    migrated.protection_key = '';
  }

  // Generate slug from file_name if not provided
  if (data.file_name && !data.slug) {
    migrated.slug = generateSlugFromFileName(data.file_name);
  }

  return migrated;
};

// ===== URL TRANSFORMATION UTILITIES =====

/**
 * Convert v1.8 URL to v1.9 URL format
 */
export const migrateURLV18toV19 = (url: string): string => {
  const urlMap: Record<string, string> = {
    '/api/v1/media/descriptions': '/api/v1/media-descriptions',
    '/api/v1/video/files': '/api/v1/video-files',
    '/api/v1/content/lists': '/api/v1/content-lists',
    '/api/v1/screen/contents': '/api/v1/screen-descriptions',
    '/api/v1/category/lists': '/api/v1/category-lists',
    '/api/v1/description/reports': '/api/v1/description-reports',
    '/api/v1/video/file/reports': '/api/v1/video-file-reports',
  };

  // Check for exact matches
  for (const [oldUrl, newUrl] of Object.entries(urlMap)) {
    if (url.includes(oldUrl)) {
      return url.replace(oldUrl, newUrl);
    }
  }

  // Return original URL if no mapping found
  return url;
};

/**
 * Convert v1.9 full URLs to just endpoint paths (removes /api/v1 prefix)
 * This is used when the base URL includes /api/v1
 */
export const getEndpointPath = (fullUrl: string): string => {
  // Remove /api/v1 prefix if present
  return fullUrl.replace('/api/v1/', '/').replace('/api/v1', '');
};

// ===== SLUG GENERATION UTILITIES =====

/**
 * Generate slug from text (used for titles, names, etc.)
 */
export const generateSlugFromText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[-\s]+/g, '_')  // Replace spaces and hyphens with underscores
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
};

/**
 * Generate slug from filename (removes extension)
 */
export const generateSlugFromFileName = (fileName: string): string => {
  // Remove file extension
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  return generateSlugFromText(nameWithoutExt);
};

/**
 * Generate slug from content list filters
 */
export const generateSlugFromContentListFilters = (data: {
  media_categories_id_list?: string[];
  themes_and_genres_id_list?: string[];
  media_type?: string;
  title?: string;
}): string => {
  const parts: string[] = [];

  // Add categories (use last part of ID if it's a UUID)
  if (data.media_categories_id_list) {
    data.media_categories_id_list.forEach(id => {
      const cleanId = id.includes('-') ? id.split('-').pop() || id : id;
      parts.push(cleanId.toLowerCase());
    });
  }

  // Add themes/genres
  if (data.themes_and_genres_id_list) {
    data.themes_and_genres_id_list.forEach(id => {
      const cleanId = id.includes('-') ? id.split('-').pop() || id : id;
      parts.push(cleanId.toLowerCase());
    });
  }

  // Add media type
  if (data.media_type) {
    parts.push(data.media_type);
  }

  // If no filters, use title
  if (parts.length === 0 && data.title) {
    return generateSlugFromText(data.title);
  }

  return parts.join('_');
};

// ===== BATCH MIGRATION UTILITIES =====

/**
 * Migrate an array of MediaDescription objects
 */
export const migrateMediaDescriptionsBatch = (data: any[]): any[] => {
  return data.map(migrateMediaDescriptionV18toV19);
};

/**
 * Migrate an array of ScreenContent objects
 */
export const migrateScreenContentsBatch = (data: any[]): any[] => {
  return data.map(migrateScreenContentV18toV19);
};

/**
 * Migrate an array of ContentList objects
 */
export const migrateContentListsBatch = (data: any[]): any[] => {
  return data.map(migrateContentListV18toV19);
};

/**
 * Migrate an array of VideoFile objects
 */
export const migrateVideoFilesBatch = (data: any[]): any[] => {
  return data.map(migrateVideoFileV18toV19);
};

// ===== VALIDATION UTILITIES =====

/**
 * Validate that v1.9 required fields are present
 */
export const validateV19ContentList = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!('latest_first' in data) || typeof data.latest_first !== 'boolean') {
    errors.push('latest_first is required and must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate MediaDescription v1.9 fields
 */
export const validateV19MediaDescription = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check for old field names that should be migrated
  if ('human_keywords_text_list' in data) {
    errors.push('human_keywords_text_list should be renamed to tag_text_list');
  }

  if ('friendly_url' in data) {
    errors.push('friendly_url should be renamed to slug');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// ===== DEBUGGING UTILITIES =====

/**
 * Log migration changes for debugging
 */
export const logMigrationChanges = (original: any, migrated: any, context?: string) => {
  const changes: string[] = [];

  // Find renamed fields
  if (original.human_keywords_text_list && migrated.tag_text_list) {
    changes.push('human_keywords_text_list → tag_text_list');
  }

  if (original.friendly_url && migrated.slug) {
    changes.push('friendly_url → slug');
  }

  // Find added fields
  if (!original.latest_first && migrated.latest_first) {
    changes.push(`added latest_first: ${migrated.latest_first}`);
  }

  if (!original.environment_key && migrated.environment_key !== undefined) {
    changes.push(`added environment_key: "${migrated.environment_key}"`);
  }

  if (!original.protection_key && migrated.protection_key !== undefined) {
    changes.push(`added protection_key: "${migrated.protection_key}"`);
  }

  if (changes.length > 0) {
    console.log(`🔄 Migration${context ? ` (${context})` : ''}:`, changes.join(', '));
  }
};

// ===== EXPORT ALL =====

export const migrationV19Utils = {
  // Data transformations
  migrateMediaDescriptionV18toV19,
  migrateScreenContentV18toV19,
  migrateContentListV18toV19,
  migrateVideoFileV18toV19,

  // URL transformations
  migrateURLV18toV19,
  getEndpointPath,

  // Slug generation
  generateSlugFromText,
  generateSlugFromFileName,
  generateSlugFromContentListFilters,

  // Batch operations
  migrateMediaDescriptionsBatch,
  migrateScreenContentsBatch,
  migrateContentListsBatch,
  migrateVideoFilesBatch,

  // Validation
  validateV19ContentList,
  validateV19MediaDescription,

  // Debugging
  logMigrationChanges,
};

export default migrationV19Utils;