import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';

export class ValidationService {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Comprehensive validation of Excel data and files
   * @param {Object} excelData - Parsed Excel data with description and files
   * @param {Object} mediaFiles - Scanned media files
   * @param {string} folderPath - Path to the media folder
   * @returns {Object} Validation result with success flag and detailed context
   */
  async validateComplete(excelData, mediaFiles, folderPath) {
    const context = {
      folderPath,
      filesFound: this.buildFilesContext(mediaFiles),
      excelData: {
        description: excelData.description,
        files: excelData.files
      },
      validationErrors: [],
      missingFiles: [],
      fileValidation: {}
    };

    let isValid = true;

    try {
      // Validate required Description fields
      const descriptionErrors = this.validateDescriptionFields(excelData.description);
      if (descriptionErrors.length > 0) {
        context.validationErrors.push(...descriptionErrors);
        isValid = false;
      }

      // Validate Files sheet data
      const mediaType = excelData.description.media_type?.toLowerCase() || 'video';
      const filesErrors = this.validateFilesSheet(excelData.files, mediaType);
      if (filesErrors.length > 0) {
        context.validationErrors.push(...filesErrors);
        isValid = false;
      }

      // Check if referenced files actually exist in the folder
      const fileExistenceResult = await this.validateFileExistence(excelData.files, mediaFiles, folderPath);
      if (!fileExistenceResult.valid) {
        context.missingFiles = fileExistenceResult.missingFiles;
        context.validationErrors.push(...fileExistenceResult.errors);
        isValid = false;
      }

      // Validate media categories mapping
      const categoriesErrors = this.validateMediaCategories(excelData.description.media_categories);
      if (categoriesErrors.length > 0) {
        context.validationErrors.push(...categoriesErrors);
        isValid = false;
      }

      this.logger.info(`Validation ${isValid ? 'passed' : 'failed'} with ${context.validationErrors.length} errors`);

      return {
        success: isValid,
        context,
        valid: isValid
      };

    } catch (error) {
      this.logger.error(`Validation process failed: ${error.message}`);
      context.validationErrors.push(`Validation process error: ${error.message}`);
      
      return {
        success: false,
        context,
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Build detailed context about files found in folder
   */
  buildFilesContext(mediaFiles) {
    return {
      videos: mediaFiles.videos.map(video => ({
        name: video.name,
        path: video.path,
        size: video.size,
        sizeFormatted: this.formatFileSize(video.size),
        extension: path.extname(video.name).toLowerCase()
      })),
      images: mediaFiles.images.map(image => ({
        name: image.name,
        path: image.path,
        size: image.size,
        sizeFormatted: this.formatFileSize(image.size),
        extension: path.extname(image.name).toLowerCase()
      })),
      subtitles: mediaFiles.subtitles.map(subtitle => ({
        name: subtitle.name,
        path: subtitle.path,
        size: subtitle.size,
        sizeFormatted: this.formatFileSize(subtitle.size),
        extension: path.extname(subtitle.name).toLowerCase()
      })),
      total: mediaFiles.videos.length + mediaFiles.images.length + mediaFiles.subtitles.length
    };
  }

  /**
   * Validate required fields in Description sheet
   */
  validateDescriptionFields(description) {
    const errors = [];
    const mediaType = description.media_type?.toLowerCase() || 'video';

    // Different required fields based on media type
    let required = [];

    switch(mediaType) {
      case 'season':
        required = [
          { field: 'season_name', name: 'Season Name' },
          { field: 'media_type', name: 'Media Type' }
        ];
        break;
      case 'program':
        required = [
          { field: 'program_name', name: 'Program Name' },
          { field: 'media_type', name: 'Media Type' }
        ];
        break;
      default: // video, excerpt, trailer, webtoon
        required = [
          { field: 'episode_title', name: 'Episode Title' },
          { field: 'media_type', name: 'Media Type' }
        ];
        break;
    }

    // Check required fields
    for (const { field, name } of required) {
      if (!description[field] || description[field].toString().trim() === '') {
        errors.push(`Missing required field for ${mediaType} type: ${name} (${field})`);
      }
    }

    // Validate media_type values
    if (description.media_type) {
      const validTypes = ['excerpt', 'trailer', 'video', 'webtoon', 'season', 'program'];
      if (!validTypes.includes(description.media_type.toLowerCase())) {
        errors.push(`Invalid media_type: "${description.media_type}". Must be one of: ${validTypes.join(', ')}`);
      }
    }

    // Validation warnings for season/program types
    if (mediaType === 'season' && description.episode_number) {
      errors.push(`Episode number should not be specified for season type`);
    }
    if (mediaType === 'program' && (description.episode_number || description.season_name)) {
      errors.push(`Episode number and season name should not be specified for program type`);
    }

    // Validate episode_number if present (only for video types)
    if ((mediaType === 'video' || mediaType === 'excerpt' || mediaType === 'trailer') &&
        description.episode_number !== undefined && description.episode_number !== null) {
      const episodeNum = parseInt(description.episode_number);
      if (isNaN(episodeNum) || episodeNum < 1) {
        errors.push(`Invalid episode_number: "${description.episode_number}". Must be a positive integer.`);
      }
    }

    // Validate policy field (should be normalized by ExcelService)
    if (description.policy) {
      const validPolicies = ['public', 'signed', 'drm'];
      if (!validPolicies.includes(description.policy.toLowerCase())) {
        errors.push(`Invalid policy: "${description.policy}". Must be one of: ${validPolicies.join(', ')}`);
      }

      // Note: DRM configuration ID comes from tool configuration, not Excel sheet
      // The Excel only specifies the policy ('drm'), the actual configuration ID
      // is provided through the tool's configuration file
    } else {
      // Error if no policy field found (ExcelService should warn but validation should catch)
      errors.push(`Policy field is required. Please add 'policy', 'policies', or 'playback_policies' field in Description sheet with value: 'public', 'signed', or 'drm'`);
    }

    return errors;
  }

  /**
   * Validate Files sheet data
   */
  validateFilesSheet(files, mediaType = 'video') {
    const errors = [];

    if (!files || files.length === 0) {
      // For season/program types, empty files sheet is acceptable
      if (mediaType === 'season' || mediaType === 'program') {
        return errors; // No errors for empty files sheet
      }
      errors.push('Files sheet is empty. Please fill at least one file entry.');
      return errors;
    }

    // Check if at least one main video is specified (not required for season/program)
    if (mediaType !== 'season' && mediaType !== 'program') {
      const hasMainVideo = files.some(file =>
        file.type && file.type.toLowerCase().includes('video') && file.fileName
      );

      if (!hasMainVideo) {
        errors.push('No main video file specified. Please specify at least one video file.');
      }
    }

    // Validate individual file entries
    files.forEach((file, index) => {
      if (file.type && !file.fileName && !file.poster && !file.frSubtitle && !file.enSubtitle && !file.koSubtitle) {
        // This entry has a type but no files - that's okay, skip validation
        return;
      }

      // If any file is specified, validate it
      const rowNum = index + 2; // Excel row number (1-indexed + header)
      
      // Validate file extensions if files are specified
      if (file.fileName) {
        const ext = path.extname(file.fileName).toLowerCase();
        if (file.type && file.type.toLowerCase().includes('video') && !['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'].includes(ext)) {
          errors.push(`Row ${rowNum}: Invalid video file extension "${ext}" for file "${file.fileName}"`);
        }
      }

      if (file.poster) {
        const ext = path.extname(file.poster).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
          errors.push(`Row ${rowNum}: Invalid image file extension "${ext}" for poster "${file.poster}"`);
        }
      }

      ['frSubtitle', 'enSubtitle', 'koSubtitle'].forEach(subField => {
        if (file[subField]) {
          const ext = path.extname(file[subField]).toLowerCase();
          if (!['.srt', '.vtt', '.ass', '.ssa', '.sub', '.sbv'].includes(ext)) {
            errors.push(`Row ${rowNum}: Invalid subtitle file extension "${ext}" for ${subField} "${file[subField]}"`);
          }

          // Check if subtitle filename follows patterns that might not be supported
          const subtitleFileName = file[subField];
          const hasSquareBrackets = /\[(fr|en|eng|ko|kr)\]/i.test(subtitleFileName);
          const hasTraditionalPattern = /[-_](fr|en|eng|ko|kr|FR|EN|ENG|KO|KR)\.(srt|vtt)$/i.test(subtitleFileName);

          if (hasSquareBrackets && !hasTraditionalPattern) {
            // This is a square bracket pattern that might need forced upload
            this.logger.info(`Row ${rowNum}: Subtitle "${subtitleFileName}" uses square bracket notation - will force upload based on Excel column position`);
          } else if (!hasTraditionalPattern && !hasSquareBrackets) {
            // No recognizable pattern at all
            this.logger.info(`Row ${rowNum}: Subtitle "${subtitleFileName}" has no standard language pattern - will force upload based on Excel column position`);
          }
        }
      });
    });

    return errors;
  }

  /**
   * Check if all referenced files actually exist in the folder
   */
  async validateFileExistence(files, mediaFiles, folderPath) {
    const errors = [];
    const missingFiles = [];
    let valid = true;

    // Create lookup maps for found files
    const allFoundFiles = [
      ...mediaFiles.videos.map(f => f.name),
      ...mediaFiles.images.map(f => f.name),
      ...mediaFiles.subtitles.map(f => f.name)
    ];

    const foundFilesSet = new Set(allFoundFiles.map(name => name.toLowerCase()));

    // Check each referenced file
    for (const file of files) {
      const filesToCheck = [
        { name: file.fileName, type: 'video' },
        { name: file.poster, type: 'image' },
        { name: file.frSubtitle, type: 'subtitle' },
        { name: file.enSubtitle, type: 'subtitle' },
        { name: file.koSubtitle, type: 'subtitle' }
      ].filter(f => f.name);

      for (const { name, type } of filesToCheck) {
        if (!foundFilesSet.has(name.toLowerCase())) {
          const filePath = path.join(folderPath, name);
          const exists = await fs.pathExists(filePath);
          
          if (!exists) {
            missingFiles.push({ name, type, expectedPath: filePath });
            errors.push(`Referenced ${type} file not found: "${name}"`);
            valid = false;
          }
        }
      }
    }

    return { valid, errors, missingFiles };
  }

  /**
   * Validate media categories mapping (handles semicolon-separated values)
   */
  validateMediaCategories(categories) {
    const errors = [];
    
    if (categories) {
      const validCategories = ['movie', 'drama', 'short-drama', 'musical', 'animation', 'documentary', 'tvshow', 'other'];
      
      // Handle semicolon-separated categories
      let categoryList;
      if (typeof categories === 'string' && categories.includes(';')) {
        categoryList = categories.split(';').map(cat => cat.trim()).filter(cat => cat.length > 0);
      } else {
        categoryList = Array.isArray(categories) ? categories : [categories];
      }
      
      for (const category of categoryList) {
        if (category && !validCategories.includes(category.toLowerCase())) {
          errors.push(`Invalid media category: "${category}". Must be one of: ${validCategories.join(', ')}`);
        }
      }
    }

    return errors;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Create detailed error report for output
   */
  createErrorReport(context, additionalErrors = []) {
    const allErrors = [...context.validationErrors, ...additionalErrors];
    
    return {
      success: false,
      error: `Upload validation failed with ${allErrors.length} error(s)`,
      phase: 'validation',
      context: {
        ...context,
        validationErrors: allErrors,
        summary: {
          totalErrors: allErrors.length,
          missingFiles: context.missingFiles?.length || 0,
          filesFound: context.filesFound?.total || 0,
          hasDescription: !!context.excelData?.description,
          hasFiles: !!(context.excelData?.files && context.excelData.files.length > 0)
        }
      }
    };
  }
}