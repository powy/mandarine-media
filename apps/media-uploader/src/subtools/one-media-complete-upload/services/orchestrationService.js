import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { uploadToMux } from '../../mux-upload/wrapper.js';
import { uploadSubtitlesToMux } from '../../mux-subtitle-upload/wrapper.js';
import { uploadPicture } from '../../picture-upload/wrapper.js';

export class OrchestrationService {
  constructor(config, logger, excelService = null) {
    this.config = config;
    this.logger = logger;
    this.excelService = excelService;
    this.tempConfigDir = path.join(process.cwd(), '.temp-configs');

    // Ensure temp directory exists
    this.ensureTempDirectory();
  }

  /**
   * Ensure temp directory exists for config files
   */
  async ensureTempDirectory() {
    try {
      await fs.ensureDir(this.tempConfigDir);
      this.logger.info(`Ensured temp directory exists: ${this.tempConfigDir}`);
    } catch (error) {
      this.logger.error(`Failed to create temp directory ${this.tempConfigDir}:`, error);
      throw new Error(`Cannot create temp directory: ${error.message}`);
    }
  }

  /**
   * Force IPv4 by replacing localhost with 127.0.0.1 to avoid IPv6 connection issues
   * @param {string} url - The URL to process
   * @returns {string} - URL with localhost replaced by 127.0.0.1
   */
  forceIPv4Url(url) {
    return url.replace(/localhost/gi, '127.0.0.1');
  }

  /**
   * Normalize semicolon-separated string by removing spaces around semicolons
   * before splitting into array
   * @param {string} str - The semicolon-separated string to process
   * @returns {string[]} - Array of trimmed, non-empty items
   */
  splitSemicolonSeparatedList(str) {
    if (!str || typeof str !== 'string') return [];

    // Remove spaces around semicolons, then split and trim each item
    const normalized = str.replace(/\s*;\s*/g, ';');
    return normalized.split(';')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  /**
   * Parse various date formats and normalize to ISO format
   * Handles: dd/mm/yyyy, dd-mm-yyyy, dd mm yyyy, with or without time
   * Default time: 12:00 (lunch time) if no time specified
   * Enhanced with better validation and debugging
   */
  parseAndNormalizeDate(dateValue) {
    if (!dateValue) return null;

    // Handle Date objects directly (Excel often provides dates as Date objects)
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) {
        return null;
      }
      const isoString = dateValue.toISOString();
      return isoString;
    }

    const dateStr = dateValue.toString().trim();
    if (!dateStr) return null;

    this.logger.info(chalk.cyan(`🔍 DATE PARSING DEBUG: "${dateStr}"`));

    // Handle various date formats
    const datePatterns = [
      // dd/mm/yyyy or dd-mm-yyyy or dd mm yyyy (European format)
      {
        pattern: /^(\d{1,2})[/\-\s](\d{1,2})[/\-\s](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
        format: 'DD/MM/YYYY',
        dayIndex: 1,
        monthIndex: 2,
        yearIndex: 3
      },
      // yyyy/mm/dd or yyyy-mm-dd (ISO format)
      {
        pattern: /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
        format: 'YYYY/MM/DD',
        dayIndex: 3,
        monthIndex: 2,
        yearIndex: 1
      }
    ];

    for (const { pattern, format, dayIndex, monthIndex, yearIndex } of datePatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        const day = parseInt(match[dayIndex]);
        const month = parseInt(match[monthIndex]);
        const year = parseInt(match[yearIndex]);
        const hour = parseInt(match[4] || '12');
        const minute = parseInt(match[5] || '00');
        const second = parseInt(match[6] || '00');

        this.logger.info(chalk.gray(`  Matched format: ${format}`));
        this.logger.info(chalk.gray(`  Regex match: ${JSON.stringify(match)}`));
        this.logger.info(chalk.gray(`  Parsed: Day=${day}, Month=${month}, Year=${year}, Time=${hour}:${minute}:${second}`));

        // Validate date components
        if (year < 1900 || year > 2100) {
          this.logger.info(chalk.red(`  ❌ Invalid year: ${year}`));
          continue;
        }
        if (month < 1 || month > 12) {
          this.logger.info(chalk.red(`  ❌ Invalid month: ${month}`));
          continue;
        }
        if (day < 1 || day > 31) {
          this.logger.info(chalk.red(`  ❌ Invalid day: ${day}`));
          continue;
        }
        if (hour < 0 || hour > 23) {
          this.logger.info(chalk.red(`  ❌ Invalid hour: ${hour}`));
          continue;
        }
        if (minute < 0 || minute > 59) {
          this.logger.info(chalk.red(`  ❌ Invalid minute: ${minute}`));
          continue;
        }

        const date = new Date(year, month - 1, day, hour, minute, second);

        // Validate that the date is valid (e.g., not February 30th)
        if (date.getFullYear() !== year || date.getMonth() !== (month - 1) || date.getDate() !== day) {
          this.logger.info(chalk.red(`  ❌ Invalid date combination: ${day}/${month}/${year}`));
          continue;
        }

        const isoString = date.toISOString();
        this.logger.info(chalk.green(`  ✅ Successfully parsed to ISO: ${isoString}`));
        return isoString;
      }
    }

    this.logger.info(chalk.red(`  ❌ No matching date pattern found for: "${dateStr}"`));
    return null;
  }

  /**
   * Normalize language names - handles gender forms and common variations
   */
  normalizeLanguage(language) {
    if (!language) return language;

    const languageNormalization = {
      // Gender form corrections (French feminine to masculine)
      'Coréenne': 'Coréen',
      'Française': 'Français',
      'Anglaise': 'Anglais',
      'Japonaise': 'Japonais',
      'Chinoise': 'Chinois',
      'Allemande': 'Allemand',
      'Italienne': 'Italien',
      'Espagnole': 'Espagnol',
      'Portugaise': 'Portugais',
      'Russe': 'Russe',

      // Common English variations
      'Korean': 'Coréen',
      'French': 'Français',
      'English': 'Anglais',
      'Japanese': 'Japonais',
      'Chinese': 'Chinois',
      'German': 'Allemand',
      'Italian': 'Italien',
      'Spanish': 'Espagnol',
      'Portuguese': 'Portugais',
      'Russian': 'Russe'
    };

    const normalized = languageNormalization[language];
    return normalized || language; // Return original if no mapping found
  }

  async processUploads(excelData, mediaFiles, folderPath, excelPath = null, options = {}) {
    const startTime = Date.now();
    const results = {
      success: false,
      mediaDescriptionId: null,
      uploads: {
        videos: [],
        images: [],
        subtitles: []
      },
      errors: [],
      context: {
        folderPath,
        filesFound: this.buildFilesContext(mediaFiles),
        excelData: {
          description: excelData.description,
          files: excelData.files
        }
      }
    };

    try {
      this.logger.info('Starting orchestrated upload process');

      // Determine media type and requirements
      let mediaType = excelData.description.media_type?.toLowerCase() || 'video';

      // Override media type based on season level flag
      if (options.isSeasonLevel === true) {
        mediaType = 'season';
        this.logger.info(chalk.yellow('🔄 Overriding media type to "season" based on folder structure'));
      } else if (options.isSeasonLevel === false) {
        // Ensure episode-level folders are treated as video/episode content
        if (mediaType === 'season' || mediaType === 'program') {
          mediaType = 'video';
          this.logger.info(chalk.yellow('🔄 Overriding media type to "video" for episode-level folder'));
        }
      }

      const requiresVideo = mediaType === 'video' || mediaType === 'excerpt' || mediaType === 'trailer';

      this.logger.info(chalk.blue.bold(`\n📦 Processing ${mediaType.toUpperCase()} Upload\n`));

      // Display mode-specific information
      switch(mediaType) {
        case 'season':
          this.logger.info(chalk.cyan('📺 Season Mode:'));
          this.logger.info(chalk.gray(`  • Season Name: ${excelData.description.season_name || 'Not specified'}`));
          this.logger.info(chalk.gray(`  • Videos: Optional (none expected)`));
          this.logger.info(chalk.gray(`  • Will create/link season entity`));
          break;

        case 'program':
          this.logger.info(chalk.cyan('📺 Program Mode:'));
          this.logger.info(chalk.gray(`  • Program Name: ${excelData.description.program_name || 'Not specified'}`));
          this.logger.info(chalk.gray(`  • Videos: Optional (none expected)`));
          this.logger.info(chalk.gray(`  • Will create/link program entity`));
          break;

        default:
          this.logger.info(chalk.cyan('🎬 Video Mode:'));
          this.logger.info(chalk.gray(`  • Episode: ${excelData.description.episode_title || 'Not specified'}`));
          this.logger.info(chalk.gray(`  • Videos: Required`));
          this.logger.info(chalk.gray(`  • Standard video upload flow`));
          break;
      }

      // Ensure temp config directory exists
      await fs.ensureDir(this.tempConfigDir);

      // Step 1: Upload videos to Mux (CONDITIONAL)
      if (requiresVideo) {
        this.logger.info(chalk.cyan('📹 Uploading videos to Mux...'));
        const videoResults = await this.uploadVideosToMux(excelData.files, mediaFiles, folderPath, excelData.description);
        results.uploads.videos = videoResults.successes;
        if (videoResults.errors.length > 0) {
          results.errors.push(...videoResults.errors);
        }

        // Get main video asset for subtitle upload
        const mainVideoAsset = videoResults.successes.find(v => v.isMainVideo);

        // Step 2: Upload subtitles to Mux (after videos are ready)
        if (videoResults.successes.length > 0) {
          this.logger.info(chalk.cyan('📝 Uploading subtitles to Mux...'));
          const subtitleResults = await this.uploadSubtitlesToMux(
            excelData.files,
            mediaFiles,
            folderPath,
            videoResults.successes // Pass all video assets instead of just main
          );
          results.uploads.subtitles = subtitleResults.successes;
          if (subtitleResults.errors.length > 0) {
            results.errors.push(...subtitleResults.errors);
          }
        }
      } else {
        this.logger.info(chalk.yellow(`ℹ️  Media type "${mediaType}" does not require video uploads - skipping video processing`));
      }

      // Step 3: Upload images to S3 (always required)
      this.logger.info(chalk.cyan('🖼️  Uploading images to S3...'));
      const imageResults = await this.uploadImagesToS3(excelData.files, mediaFiles, folderPath);
      results.uploads.images = imageResults.successes;
      if (imageResults.errors.length > 0) {
        results.errors.push(...imageResults.errors);
      }

      // Safety check: Ensure images are uploaded even if normal flow was bypassed
      if ((!results.uploads.images || results.uploads.images.length === 0) && mediaFiles.images.length > 0) {
        this.logger.info(chalk.cyan('🖼️  Uploading missing images to S3...'));
        const imageResults = await this.uploadImagesToS3(excelData.files, mediaFiles, folderPath);
        results.uploads.images = imageResults.successes;
        if (imageResults.errors.length > 0) {
          results.errors.push(...imageResults.errors);
        }
      }

      // Step 4: Create media description via API (two-step process)
      this.logger.info(chalk.cyan('📄 Creating media description...'));
      const apiResult = await this.createMediaDescription(
        excelData.description,
        results.uploads.images,
        results.uploads.videos // Use results.uploads.videos instead of videoResults.successes
      );
      
      if (apiResult.success) {
        results.mediaDescriptionId = apiResult.id;
        results.success = true;
        this.logger.info(chalk.green(`✅ Media description created with ID: ${apiResult.id}`));
        
        // Update Excel file with media_description ID and rename file
        if (this.excelService && excelPath) {
          try {
            this.logger.info(chalk.cyan('📄 Updating Excel file with media description ID...'));
            
            // Save media_description ID to Description sheet
            await this.excelService.saveMediaDescriptionToExcel(excelPath, apiResult.id);
            this.logger.info(chalk.green(`✅ Saved media description ID to Excel`));
            
            // Rename Excel file with _uploaded suffix
            const newExcelPath = await this.excelService.renameExcelFile(excelPath);
            const wasRenamed = (newExcelPath !== excelPath);

            if (wasRenamed) {
              this.logger.info(chalk.green(`✅ Renamed Excel file: ${path.basename(newExcelPath)}`));
            } else {
              this.logger.info(chalk.yellow(`⚠️  Excel file not renamed (may be open): ${path.basename(excelPath)}`));
            }

            // Store the new Excel path and rename status in results for reference
            results.updatedExcelPath = newExcelPath;
            results.excelRenamed = wasRenamed;
            
          } catch (excelError) {
            // Don't fail the entire upload process if Excel update fails
            this.logger.error(`Excel update failed: ${excelError.message}`);
            results.errors.push(`Excel update failed: ${excelError.message}`);

            // Enhanced visible error reporting
            this.logger.info(chalk.red.bold(`\n❌ EXCEL UPDATE FAILED`));
            this.logger.info(chalk.yellow(`📄 Media Description ID: ${chalk.white.bold(apiResult.id)}`));
            this.logger.info(chalk.red(`🔒 Error: ${excelError.message}`));

            // Check if it's a file lock error and provide specific guidance
            const isFileLocked = excelError.message.includes('locked') ||
                               excelError.message.includes('being used') ||
                               excelError.message.includes('EBUSY') ||
                               excelError.message.includes('EPERM');

            if (isFileLocked) {
              this.logger.info(chalk.cyan(`\n💡 To fix this:`));
              this.logger.info(chalk.cyan(`   1. Close the Excel file`));
              this.logger.info(chalk.cyan(`   2. The media description was created successfully with ID: ${apiResult.id}`));
              this.logger.info(chalk.cyan(`   3. You can manually add this ID to your Excel file if needed`));
            }

            this.logger.info(chalk.green(`\n✅ Upload was successful despite Excel update failure!`));
          }
        } else {
          this.logger.warn('ExcelService or excelPath not available - skipping Excel update');
        }
      } else {
        results.errors.push(`Media description creation failed: ${apiResult.error}`);
      }
      
      const totalTime = Date.now() - startTime;
      this.logger.info(`Upload process completed in ${totalTime}ms with ${results.errors.length} errors`);
      
      return results;
      
    } catch (error) {
      this.logger.error(`Orchestration failed: ${error.message}`);
      results.errors.push(`Orchestration error: ${error.message}`);
      results.context.orchestrationError = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      return results;
    } finally {
      // Cleanup temp configs
      await this.cleanupTempConfigs();
    }
  }

  async uploadVideosToMux(filesData, mediaFiles, folderPath, descriptionData) {
    const successes = [];
    const errors = [];

    const mediaType = descriptionData.media_type?.toLowerCase() || 'video';

    // For season/program types, check if videos are actually specified
    if (mediaType === 'season' || mediaType === 'program') {
      const videoEntries = filesData.filter(file => {
        if (!file.type || !file.fileName) return false;
        const type = file.type.toLowerCase();
        return type.includes('video') || type.includes('trailer') || type.includes('excerpt');
      });

      if (videoEntries.length === 0) {
        this.logger.info(`No videos specified for ${mediaType} type - this is acceptable`);
        this.logger.info(chalk.gray(`  No video files specified for ${mediaType} - this is normal`));
        return { successes: [], errors: [] };
      } else {
        this.logger.info(chalk.gray(`  Found ${videoEntries.length} video(s) for ${mediaType} - processing as optional content`));
      }
    }

    // Log all entries from Excel for debugging
    this.logger.info(`All Excel file entries (${filesData.length} total):`, {
      entries: filesData.map(entry => `"${entry.type}": ${entry.fileName}`).join(', ')
    });
    
    // Get video files from Files sheet - include main videos, trailers, and excerpts
    const videoEntries = filesData.filter(file => {
      if (!file.type || !file.fileName) return false;
      const type = file.type.toLowerCase();
      const isVideo = type.includes('video') || type.includes('trailer') || type.includes('excerpt') || type.includes('extract');
      
      // Log each decision for debugging
      if (file.type && file.fileName) {
        this.logger.debug(`Processing entry "${file.type}": ${file.fileName} -> ${isVideo ? 'INCLUDED' : 'EXCLUDED'}`);
      }
      
      return isVideo;
    });
    
    this.logger.info(`Filtered video entries (${videoEntries.length} found):`, {
      entries: videoEntries.map(entry => `"${entry.type}": ${entry.fileName}`).join(', ')
    });
    
    // Specific debugging for excerpts
    const excerptEntries = videoEntries.filter(entry => {
      const type = entry.type.toLowerCase();
      return type.includes('excerpt') || type.includes('extract');
    });
    if (excerptEntries.length > 0) {
      this.logger.info(`Excerpt entries found (${excerptEntries.length}):`, {
        excerpts: excerptEntries.map(entry => `"${entry.type}": ${entry.fileName}`).join(', ')
      });
    } else {
      this.logger.warn('No excerpt entries found in filtered video entries');
    }
    
    // Log any entries that were filtered out (for debugging)
    const filteredOut = filesData.filter(file => {
      if (!file.type || !file.fileName) return true;
      const type = file.type.toLowerCase();
      return !(type.includes('video') || type.includes('trailer') || type.includes('excerpt'));
    }).filter(file => file.type && file.fileName); // Only show entries that have both type and fileName
    
    if (filteredOut.length > 0) {
      this.logger.info(`Non-video entries found (${filteredOut.length}):`, {
        entries: filteredOut.map(entry => `"${entry.type}": ${entry.fileName}`).join(', ')
      });
    }
    
    for (const entry of videoEntries) {
      try {
        this.logger.info(`Looking for video file: "${entry.fileName}" (from Excel)`);
        this.logger.info(`Available videos: ${mediaFiles.videos.map(v => `"${v.name}"`).join(', ')}`);
        
        // Normalize whitespace for robust matching
        const normalizeFileName = (name) => name.toLowerCase().replace(/\s+/g, ' ').trim();
        
        const videoFile = mediaFiles.videos.find(v => 
          normalizeFileName(v.name) === normalizeFileName(entry.fileName)
        );
        
        if (!videoFile) {
          errors.push(`Video file not found: ${entry.fileName}`);
          this.logger.error(`No match found for "${entry.fileName}" among available files`);
          continue;
        }
        
        this.logger.info(`Found matching video file: "${videoFile.name}" at path: "${videoFile.path}"`)
        
        // Generate config for mux-upload with policy and DRM handling
        const configPath = await this.generateMuxUploadConfig(videoFile, entry, descriptionData);
        
        // Log excerpt processing specifically
        if (entry.type.toLowerCase().includes('excerpt')) {
          this.logger.info(`Processing excerpt upload:`, {
            fileName: videoFile.name,
            type: entry.type,
            configPath: configPath
          });
        }
        
        this.logger.info(chalk.gray(`  Uploading ${videoFile.name}...`));

        const result = await uploadToMux({
          config: configPath,
          verbose: false,
          quiet: true
        }, {
          taskId: this.taskId || `video-${Date.now()}`,
          executionMode: 'orchestration',
          videoFileName: videoFile.name
        });
        
        const isMainVideo = entry.type.toLowerCase() === 'video';
        const uploadData = {
          fileName: videoFile.name,
          type: entry.type,
          assetId: result.asset.id,
          playbackId: result.asset.playback_ids?.[0]?.id,
          status: result.asset.status,
          isMainVideo,
          result
        };

        // Add backend record info if available
        if (result.backend_record) {
          uploadData.backendRecordId = result.backend_record.id;
          uploadData.uploadStatus = result.backend_record.upload_status;
          this.logger.info(`Video file record created for ${entry.type}`, {
            fileName: videoFile.name,
            type: entry.type,
            assetId: result.asset.id,
            backendRecordId: result.backend_record.id,
            uploadStatus: result.backend_record.upload_status
          });
        } else {
          this.logger.warn(`No backend record created for ${entry.type}`, {
            fileName: videoFile.name,
            type: entry.type,
            assetId: result.asset.id
          });
        }
        
        successes.push(uploadData);
        
        this.logger.info(chalk.green(`    ✅ ${videoFile.name} uploaded (Asset: ${result.asset.id}, Type: ${entry.type})`));
        
      } catch (error) {
        const isMainVideo = entry.type.toLowerCase() === 'video';
        const isTrailer = entry.type.toLowerCase() === 'trailer';
        const isCritical = isMainVideo || isTrailer;

        const errorMsg = `Failed to upload video ${entry.fileName}: ${error.message}`;
        errors.push(errorMsg);

        // Extract retry information if available
        const retryInfo = {
          attempts: error.attempts || 'unknown',
          errorCode: error.errorCode || error.code || 'UNKNOWN'
        };

        // Enhanced error logging with detailed context
        const errorContext = {
          fileName: entry.fileName,
          type: entry.type,
          isCritical: isCritical,
          error: error.message,
          code: error.code,
          errorCode: error.errorCode,
          errno: error.errno,
          retryAttempts: retryInfo.attempts,
          stack: error.stack
        };

        // Add detailed error information if available
        if (error.details) {
          errorContext.details = error.details;
        }

        // Enhanced error message with retry context
        let errorDisplayMsg = error.message;
        if (retryInfo.attempts !== 'unknown') {
          errorDisplayMsg += ` (${retryInfo.attempts} attempts)`;
        }

        this.logger.info(chalk.red(`    ❌ ${entry.fileName}: ${errorDisplayMsg}`));
        this.logger.error('Video upload failed with detailed context', errorContext);

        // Add network diagnostic suggestion for network errors
        const networkErrors = ['ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'];
        if (networkErrors.includes(retryInfo.errorCode)) {
          this.logger.error(`Network error detected: ${retryInfo.errorCode}`, {
            suggestion: 'Check network connectivity, DNS resolution, and firewall settings',
            errorType: this.getNetworkErrorDescription(retryInfo.errorCode)
          });
        }

        // Critical failure handling - stop immediately for main videos
        if (isCritical) {
          this.logger.info(chalk.red.bold(`\n🚨 CRITICAL UPLOAD FAILURE`));
          this.logger.info(chalk.red(`Main video upload failed: ${entry.fileName}`));
          this.logger.info(chalk.red(`Process terminated to prevent incomplete upload.`));

          if (networkErrors.includes(retryInfo.errorCode)) {
            this.logger.info(chalk.yellow(`\n💡 Network Issue Detected:`));
            this.logger.info(chalk.yellow(`   Error Type: ${this.getNetworkErrorDescription(retryInfo.errorCode)}`));
            this.logger.info(chalk.yellow(`   Retry Attempts: ${retryInfo.attempts}`));
            this.logger.info(chalk.yellow(`   Suggestion: Check your network connection and try again`));
          }

          this.logger.error('Critical video upload failure - terminating process', {
            fileName: entry.fileName,
            type: entry.type,
            error: error.message,
            retryAttempts: retryInfo.attempts,
            errorCode: retryInfo.errorCode
          });

          throw new Error(`Critical upload failure: ${errorMsg}`);
        }
      }
    }
    
    return { successes, errors };
  }

  async uploadImagesToS3(filesData, mediaFiles, folderPath) {
    const successes = [];
    const errors = [];

    // Build a map of image files to their dimensions from Excel
    const imageDimensionMap = new Map();

    filesData.forEach(file => {
      // Process image_* rows to extract dimension mappings
      if (file.type && file.type.toLowerCase().startsWith('image_') && file.fileName) {
        // Extract dimension from row type: "image_1920_1080" -> "1920x1080"
        const dimension = file.type.replace(/^image_/, '').replace('_', 'x');
        imageDimensionMap.set(file.fileName.toLowerCase(), dimension);
        this.logger.info(`Excel dimension mapping: ${file.fileName} -> ${dimension} (from row type: ${file.type})`);
      }
    });

    this.logger.info(`Built dimension mappings from Excel for ${imageDimensionMap.size} images`);

    // Collect image files from both poster column AND image entries in Files sheet
    const imageFiles = new Set();
    filesData.forEach(file => {
      // Add poster images (column 3 - "Poster" column)
      if (file.poster) {
        imageFiles.add(file.poster);
      }
      
      // Add image entries (where type contains "image" and filename is specified)
      if (file.type && file.type.toLowerCase().includes('image') && file.fileName) {
        imageFiles.add(file.fileName);
      }
    });
    
    this.logger.info(`Found ${imageFiles.size} image files to upload:`, {
      images: Array.from(imageFiles).join(', ')
    });
    
    for (const fileName of imageFiles) {
      try {
        const imageFile = mediaFiles.images.find(img => 
          img.name.toLowerCase() === fileName.toLowerCase()
        );
        
        if (!imageFile) {
          errors.push(`Image file not found: ${fileName}`);
          continue;
        }
        
        // Generate config for picture-upload
        const configPath = await this.generatePictureUploadConfig(imageFile);
        
        this.logger.info(chalk.gray(`  Uploading ${imageFile.name}...`));
        
        const result = await uploadPicture({
          config: configPath,
          verbose: false
        });
        
        // Get dimensions from Excel mapping instead of guessing from filename
        const dimensions = imageDimensionMap.get(imageFile.name.toLowerCase());

        if (dimensions) {
          this.logger.info(`Using Excel dimension mapping for ${imageFile.name}: ${dimensions}`);
        } else {
          this.logger.warn(`No dimension mapping found in Excel for image: ${imageFile.name}`);
        }

        successes.push({
          fileName: imageFile.name,
          s3Url: result.s3.url,
          s3Key: result.s3.key,
          pictureId: result.api.id,
          dimensions: dimensions, // From Excel mapping, not guessed from filename
          result
        });
        
        this.logger.info(chalk.green(`    ✅ ${imageFile.name} uploaded (ID: ${result.api.id})`));
        
      } catch (error) {
        const errorMsg = `Failed to upload image ${fileName}: ${error.message}`;
        errors.push(errorMsg);
        this.logger.info(chalk.red(`    ❌ ${fileName}: ${error.message}`));
        this.logger.error(errorMsg);
      }
    }
    
    return { successes, errors };
  }

  async uploadSubtitlesToMux(filesData, mediaFiles, folderPath, videoAssets) {
    const successes = [];
    const errors = [];
    
    // Collect subtitle files from Files sheet
    const subtitleFiles = [];
    filesData.forEach(file => {
      if (file.frSubtitle) subtitleFiles.push({ fileName: file.frSubtitle, language: 'fr', name: 'Français', isDefault: true });
      if (file.enSubtitle) subtitleFiles.push({ fileName: file.enSubtitle, language: 'en', name: 'English', isDefault: false });
      if (file.koSubtitle) subtitleFiles.push({ fileName: file.koSubtitle, language: 'ko', name: '한국어', isDefault: false });
      // Handle kr files as Korean too (common variant in real-world files)
      if (file.krSubtitle) subtitleFiles.push({ fileName: file.krSubtitle, language: 'ko', name: '한국어', isDefault: false });
    });
    
    if (subtitleFiles.length === 0) {
      this.logger.info(chalk.gray('  No subtitles to upload'));
      return { successes, errors };
    }
    
    // Group subtitles by their corresponding video asset
    const subtitlesByAsset = new Map();
    
    subtitleFiles.forEach(subtitleFile => {
      // Find the corresponding video asset by matching filename patterns
      // For Excel-provided subtitles, we trust the language from column position
      const matchingAsset = this.findMatchingVideoAssetForSubtitle(subtitleFile.fileName, videoAssets, subtitleFile.language);

      if (matchingAsset) {
        if (!subtitlesByAsset.has(matchingAsset.assetId)) {
          subtitlesByAsset.set(matchingAsset.assetId, {
            asset: matchingAsset,
            subtitles: []
          });
        }
        subtitlesByAsset.get(matchingAsset.assetId).subtitles.push(subtitleFile);

        // Enhanced logging to show Excel-forced vs traditional matching
        const matchType = subtitleFile.language ? '[Excel-forced]' : '[Pattern-based]';
        this.logger.info(`Matched subtitle "${subtitleFile.fileName}" (${subtitleFile.language}) to video asset: ${matchingAsset.assetId} (${matchingAsset.type}) ${matchType}`);

        // Log specific matching details for Excel-forced uploads
        this.logger.info(chalk.cyan(`📎 Subtitle Match: "${subtitleFile.fileName}" -> "${matchingAsset.fileName}" ${matchType}`));
      } else {
        const errorMsg = `No matching video asset found for subtitle: ${subtitleFile.fileName}`;
        errors.push(errorMsg);
        this.logger.error(errorMsg);
        this.logger.info(chalk.red(`❌ Subtitle Match Failed: "${subtitleFile.fileName}" - no compatible video asset found`));
      }
    });
    
    // Process subtitles for each video asset
    for (const [assetId, assetData] of subtitlesByAsset.entries()) {
      try {
        this.logger.info(`Processing ${assetData.subtitles.length} subtitles for asset: ${assetId} (${assetData.asset.type})`);

        // Log each subtitle being uploaded with enhanced Excel-forced indicator
        assetData.subtitles.forEach(subtitle => {
          const hasTraditionalPattern = /[-_](fr|en|eng|ko|kr|FR|EN|ENG|KO|KR)\.(srt|vtt)$/i.test(subtitle.fileName);
          const hasSquareBrackets = /\[(fr|en|eng|ko|kr)\]/i.test(subtitle.fileName);
          const isExcelForced = !hasTraditionalPattern || hasSquareBrackets;

          if (isExcelForced) {
            this.logger.info(`  🔍 EXCEL-FORCED: "${subtitle.fileName}" -> ${subtitle.language} (column-based language assignment)`);
            this.logger.info(chalk.yellow(`    📋 Language from Excel column, not filename pattern`));
          } else {
            this.logger.debug(`  📝 Pattern-based: "${subtitle.fileName}" -> ${subtitle.language} (traditional filename matching)`);
            this.logger.info(chalk.gray(`    🔤 Language detected from filename pattern`));
          }
        });

        // Generate config for this specific asset's subtitles
        const configPath = await this.generateSubtitleUploadConfig(assetData.subtitles, mediaFiles, assetId);

        this.logger.info(chalk.gray(`  Uploading ${assetData.subtitles.length} subtitle files for ${assetData.asset.type}...`));

        const result = await uploadSubtitlesToMux({
          config: configPath,
          verbose: false,
          quiet: true
        });
        
        if (result.success && result.results) {
          result.results.forEach(res => {
            if (res.success) {
              successes.push({
                fileName: res.subtitle.file_path,
                language: res.subtitle.language_code,
                name: res.subtitle.name,
                trackId: res.trackId || res.muxResult?.trackId,
                assetId: assetId,
                videoType: assetData.asset.type,
                result: res
              });
              this.logger.info(chalk.green(`    ✅ ${res.subtitle.language_code} (${assetData.asset.type}): ${res.trackId || res.muxResult?.trackId || 'unknown'}`));
            } else {
              errors.push(`Subtitle upload failed (${res.subtitle.language_code}, ${assetData.asset.type}): ${res.error}`);
              this.logger.info(chalk.red(`    ❌ ${res.subtitle.language_code} (${assetData.asset.type}): ${res.error}`));
            }
          });
        }
        
      } catch (error) {
        const errorMsg = `Subtitle upload failed for asset ${assetId} (${assetData.asset.type}): ${error.message}`;
        errors.push(errorMsg);
        this.logger.info(chalk.red(`    ❌ ${errorMsg}`));
        this.logger.error(errorMsg);
      }
    }
    
    return { successes, errors };
  }

  /**
   * Find the matching video asset for a subtitle file based on filename patterns
   * Enhanced to support Excel-forced uploads with language from column position
   */
  findMatchingVideoAssetForSubtitle(subtitleFileName, videoAssets, excelProvidedLanguage = null) {
    // When Excel provides the language, we trust it completely and use flexible matching
    if (excelProvidedLanguage) {
      this.logger.info(`Excel-forced subtitle upload: "${subtitleFileName}" -> language: ${excelProvidedLanguage}`);

      // Extract base name by removing language patterns and extensions
      let baseName = subtitleFileName;

      // Remove file extension first
      baseName = baseName.replace(/\.(srt|vtt|ass|ssa|sub|sbv)$/i, '').trim();

      // Remove common language patterns from subtitle filename
      baseName = baseName.replace(/[-_\s]+(fr|en|eng|ko|kr|FR|EN|ENG|KO|KR)$/i, ''); // Language suffix
      baseName = baseName.replace(/\s*[-_]\s*(fr|en|eng|ko|kr|FR|EN|ENG|KO|KR)$/i, ''); // Space-dash-language
      baseName = baseName.replace(/\s*\[(fr|en|eng|ko|kr|FR|EN|ENG|KO|KR)\]/i, ''); // [language] brackets
      baseName = baseName.replace(/\s*-\s*\[(fr|en|eng|ko|kr|FR|EN|ENG|KO|KR)\]/i, ''); // - [language] brackets
      baseName = baseName.trim();

      this.logger.info(`Extracted base name for Excel-forced subtitle: "${baseName}"`);

      // Try exact match first
      let matchingAsset = videoAssets.find(asset => {
        let videoBaseName = asset.fileName.replace(/\.(mp4|mov|avi)$/i, '');
        // Remove language suffixes from video name
        videoBaseName = videoBaseName.replace(/[-_](en|fr|ko|kr)$/i, '');
        videoBaseName = videoBaseName.replace(/\s*-\s*(en|fr|ko|kr)$/i, '');

        const exactMatch = videoBaseName === baseName;
        if (exactMatch) {
          this.logger.info(`Excel-forced exact match: "${baseName}" -> "${videoBaseName}" (${asset.type})`);
        }
        return exactMatch;
      });

      // If no exact match, try flexible matching for Excel-provided subtitles
      if (!matchingAsset) {
        this.logger.info(`No exact match found, trying flexible matching for Excel subtitle: ${subtitleFileName}`);

        matchingAsset = videoAssets.find(asset => {
          const videoBase = asset.fileName.replace(/\.(mp4|mov|avi)$/i, '').replace(/[-_](en|fr|ko|kr)$/i, '');

          // Try partial matching - either direction
          const subtitleContainsVideo = baseName.toLowerCase().includes(videoBase.toLowerCase());
          const videoContainsSubtitle = videoBase.toLowerCase().includes(baseName.toLowerCase());

          // Also try number extraction for episode matching
          const subtitleNumbers = baseName.match(/\d+/g);
          const videoNumbers = videoBase.match(/\d+/g);
          const numberMatch = subtitleNumbers && videoNumbers &&
                             subtitleNumbers.some(sNum => videoNumbers.includes(sNum));

          const isMatch = subtitleContainsVideo || videoContainsSubtitle || numberMatch;

          if (isMatch) {
            this.logger.info(`Excel-forced flexible match: "${baseName}" <-> "${videoBase}" (${asset.type})`);
            this.logger.info(`  Match type: ${subtitleContainsVideo ? 'subtitle-contains-video' :
                                        videoContainsSubtitle ? 'video-contains-subtitle' : 'number-match'}`);
          }

          return isMatch;
        });
      }

      // If still no match, return the first video asset as fallback for Excel-forced uploads
      if (!matchingAsset && videoAssets.length > 0) {
        matchingAsset = videoAssets[0];
        this.logger.warn(`Excel-forced fallback: No match found for "${subtitleFileName}", using first available video: "${matchingAsset.fileName}" (${matchingAsset.type})`);
      }

      return matchingAsset;
    }

    // Traditional pattern matching for non-Excel uploads (legacy behavior)
    const baseNameMatch = subtitleFileName.match(/^(.+?)(?:\s*[-_]\s*)(fr|en|eng|ko|kr|FR|EN|ENG|KO|KR)\.(srt|vtt)$/i);
    let baseName = null;

    if (baseNameMatch) {
      baseName = baseNameMatch[1].trim();
      this.logger.debug(`Using traditional pattern for subtitle: "${subtitleFileName}" -> base: "${baseName}"`);
    } else {
      // Handle square bracket notation: "767 - [en] Running Man Episode 767.vtt"
      const squareBracketMatch = subtitleFileName.match(/^(.+?)\s*\[(fr|en|eng|ko|kr)\]/i);
      if (squareBracketMatch) {
        baseName = squareBracketMatch[1].trim();
        this.logger.debug(`Using square bracket pattern for subtitle: "${subtitleFileName}" -> base: "${baseName}"`);
      } else {
        baseName = subtitleFileName.replace(/\.(srt|vtt|ass|ssa|sub|sbv)$/i, '').trim();
        this.logger.debug(`Using full base name for subtitle: "${subtitleFileName}" -> base: "${baseName}"`);
      }
    }

    if (!baseName) {
      this.logger.warn(`Could not extract base name from subtitle: ${subtitleFileName}`);
      return null;
    }

    // Traditional exact matching
    const matchingAsset = videoAssets.find(asset => {
      let videoBaseName = asset.fileName.replace(/\.(mp4|mov|avi)$/i, '');
      videoBaseName = videoBaseName.replace(/[-_](en|fr|ko|kr)$/i, '');
      videoBaseName = videoBaseName.replace(/\s*-\s*(en|fr|ko|kr)$/i, '');

      const matches = videoBaseName === baseName;
      if (matches) {
        this.logger.debug(`Found traditional match: "${baseName}" -> "${videoBaseName}" (${asset.type})`);
      }
      return matches;
    });

    if (!matchingAsset) {
      this.logger.warn(`No video asset found for subtitle base name: "${baseName}"`);
      this.logger.debug(`Available video assets: ${videoAssets.map(a => `"${a.fileName}" (${a.type})`).join(', ')}`);
    }

    return matchingAsset;
  }

  /**
   * Authenticate with backend and get JWT token
   */
  async authenticateWithBackend() {
    try {
      const loginUrl = this.forceIPv4Url(`${this.config.backend.baseUrl}/api/v1/auth/login`);

      this.logger.info(`Authenticating with backend: ${loginUrl}`);
      
      const loginData = new URLSearchParams();
      loginData.append('username', this.config.backend.username);
      loginData.append('password', this.config.backend.password);
      
      const response = await axios.post(loginUrl, loginData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });
      
      if (response.status === 200 && response.data.access_token) {
        this.logger.info('Successfully authenticated with backend');
        return {
          success: true,
          token: response.data.access_token
        };
      } else {
        return {
          success: false,
          error: `Login failed - invalid response: ${JSON.stringify(response.data)}`
        };
      }
      
    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`);
      
      if (error.response) {
        this.logger.error(`Login Response Status: ${error.response.status}`);
        this.logger.error(`Login Response Data: ${JSON.stringify(error.response.data)}`);
      }
      
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  async checkForDuplicates(descriptionData) {
    try {
      // First authenticate to get JWT token
      const authResult = await this.authenticateWithBackend();
      if (!authResult.success) {
        return {
          success: false,
          error: `Authentication failed: ${authResult.error}`
        };
      }

      const apiUrl = this.forceIPv4Url(`${this.config.backend.baseUrl}/api/v1/media-descriptions`);

      this.logger.info(`Checking for duplicates via API: ${apiUrl}`);
      
      // Query API for existing media descriptions
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${authResult.token}`
        },
        params: {
          limit: 100  // Start with reasonable limit, may need pagination for large datasets
        },
        timeout: 15000
      });

      if (response.status === 200 && response.data) {
        let existingItems = [];
        
        // Handle different possible response structures
        if (Array.isArray(response.data)) {
          existingItems = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          existingItems = response.data.data;
        } else if (response.data.items && Array.isArray(response.data.items)) {
          existingItems = response.data.items;
        } else {
          this.logger.error(`Unexpected API response structure: ${JSON.stringify(response.data)}`);
          existingItems = [];
        }
        
        // Check for duplicates
        const duplicates = {
          bySlug: null,
          byTitle: null
        };

        if (descriptionData.slug && existingItems.length > 0) {
          duplicates.bySlug = existingItems.find(item => 
            item.slug && item.slug.toLowerCase() === descriptionData.slug.toLowerCase()
          );
        }

        if (descriptionData.episode_title && existingItems.length > 0) {
          duplicates.byTitle = existingItems.find(item =>
            item.episode_title && String(item.episode_title || '').toLowerCase() === String(descriptionData.episode_title || '').toLowerCase()
          );
        }

        this.logger.info(`Duplicate check completed: ${existingItems.length} records checked`);
        
        if (duplicates.bySlug) {
          this.logger.info(`Found duplicate slug: ${duplicates.bySlug.slug} (ID: ${duplicates.bySlug.id})`);
        }
        if (duplicates.byTitle) {
          this.logger.info(`Found duplicate title: ${duplicates.byTitle.episode_title} (ID: ${duplicates.byTitle.id})`);
        }

        return {
          success: true,
          duplicates,
          totalChecked: existingItems.length
        };
      } else {
        return {
          success: false,
          error: `API returned unexpected response: ${response.status}`
        };
      }

    } catch (error) {
      this.logger.error(`Duplicate check failed: ${error.message}`);
      
      if (error.response) {
        this.logger.error(`API Response Status: ${error.response.status}`);
        this.logger.error(`API Response Data: ${JSON.stringify(error.response.data)}`);
      }
      
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  async createMediaDescription(descriptionData, uploadedImages, videoAssets) {
    try {
      // First authenticate to get JWT token
      const authResult = await this.authenticateWithBackend();
      if (!authResult.success) {
        return {
          success: false,
          error: `Authentication failed: ${authResult.error}`,
          details: authResult.details
        };
      }

      // Validate that images were actually uploaded (not fake IDs)
      if (uploadedImages && uploadedImages.length > 0) {
        for (const image of uploadedImages) {
          if (!image.s3Url || !image.pictureId || !image.s3Key) {
            this.logger.warn(`Image ${image.fileName || 'unknown'} has incomplete upload data`, {
              hasS3Url: !!image.s3Url,
              hasPictureId: !!image.pictureId,
              hasS3Key: !!image.s3Key
            });
            throw new Error(`Image ${image.fileName || 'unknown'} was not properly uploaded to S3. Missing required upload data.`);
          }
        }
        this.logger.info(`Validated ${uploadedImages.length} uploaded images - all have proper S3 data`);
      }

      // Handle season and program types differently
      const mediaType = descriptionData.media_type?.toLowerCase() || 'video';
      let seasonId = null;
      let programId = null;

      // For SEASON type: get or create season first
      if (mediaType === 'season') {
        if (!descriptionData.season_name) {
          throw new Error('Season name is required for season type media');
        }

        this.logger.info(chalk.cyan('📂 Processing Season type - managing season entity...'));

        const season = await this.getOrCreateSeason(descriptionData.season_name);
        seasonId = season.id;

        // For season type, use season name as episode title (required field) if not provided
        if (!descriptionData.episode_title) {
          descriptionData.episode_title = descriptionData.season_name;
          this.logger.info(chalk.yellow(`🔄 Using season name as episode title: ${descriptionData.episode_title}`));
        }

        // ALWAYS mark season uploads for cleanup (to remove season_id and link to season.general_media_description_id)
        descriptionData._needsSeasonCleanup = true;
        descriptionData._seasonName = descriptionData.season_name;
        this.logger.info(chalk.cyan(`🧹 Season upload marked for post-treatment cleanup`));
      }

      // For PROGRAM type: get or create program first
      else if (mediaType === 'program') {
        if (!descriptionData.program_name) {
          throw new Error('Program name is required for program type media');
        }

        this.logger.info(chalk.cyan('📂 Processing Program type - managing program entity...'));

        const program = await this.getOrCreateProgram(descriptionData.program_name);
        programId = program.id;

        // For program type, use program name as episode title (required field)
        if (!descriptionData.episode_title) {
          descriptionData.episode_title = descriptionData.program_name;
        }
      }

      // STEP 1: Create media description with text-only fields
      this.logger.info('Step 1: Creating media description with text-only fields...');
      const textOnlyData = this.mapExcelToApiSchemaTextOnly(descriptionData);

      // Add the season or program ID if applicable
      if (seasonId) {
        textOnlyData.season_id = seasonId;
        this.logger.info(chalk.gray(`  • Linking to season ID: ${seasonId}`));
      }
      if (programId) {
        textOnlyData.program_id = programId;
        this.logger.info(chalk.gray(`  • Linking to program ID: ${programId}`));
      }
      
      const createUrl = this.forceIPv4Url(`${this.config.backend.baseUrl}/api/v1/media-descriptions/from-text`);
      
      this.logger.info(`Creating media description via API: ${createUrl}`);
      this.logger.info(`Using JWT Bearer token authentication`);
      this.logger.info(`Text-only API payload keys: ${Object.keys(textOnlyData).join(', ')}`);

      // Enhanced API payload logging for debugging
      this.logger.info(chalk.blue('\n🔍 API Payload Debug Information:'));
      this.logger.info(chalk.gray('===================================='));

      // Log arrays specifically to debug array processing issue
      const arrayFields = ['actor_names', 'director_names', 'producer_names', 'author_names', 'tags', 'hashtags_text_list', 'human_keywords_text_list'];
      arrayFields.forEach(field => {
        if (textOnlyData[field]) {
          this.logger.info(chalk.yellow(`${field}: ${JSON.stringify(textOnlyData[field])} (${Array.isArray(textOnlyData[field]) ? 'array' : 'type: ' + typeof textOnlyData[field]})`));
        }
      });

      // Log all other fields
      const otherFields = Object.keys(textOnlyData).filter(key => !arrayFields.includes(key));
      if (otherFields.length > 0) {
        this.logger.info(chalk.cyan('\nOther fields:'));
        otherFields.forEach(field => {
          this.logger.info(chalk.gray(`${field}: "${textOnlyData[field]}"`));
        });
      }

      // Log backend API compliance summary
      this.logger.info(chalk.cyan('\n📋 Backend API Compliance Summary:'));
      this.logger.info(chalk.green('✅ Field mappings fixed to match /from-text endpoint schema exactly'));
      this.logger.info(chalk.green('✅ Legacy productors_id_list → producer_names mapping corrected'));
      this.logger.info(chalk.green('✅ Removed invalid "tags" field (not supported by backend)'));
      this.logger.info(chalk.green('✅ Array fields sending exact backend field names only'));
      this.logger.info(chalk.yellow('⚠️  Some fields not supported by /from-text endpoint (see warnings above)'));

      // Log complete JSON payload for backend debugging
      this.logger.info(`Complete API payload: ${JSON.stringify(textOnlyData, null, 2)}`);
      this.logger.info(chalk.gray('====================================\n'));

      // Make API call to create media description with text-only fields
      const createResponse = await axios.post(
        createUrl,
        textOnlyData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authResult.token}`
          },
          timeout: 30000
        }
      );
      
      if (createResponse.status !== 200 && createResponse.status !== 201) {
        return {
          success: false,
          error: `Initial creation failed with status ${createResponse.status}`,
          response: createResponse.data
        };
      }
      
      const mediaDescriptionId = createResponse.data.id;
      this.logger.info(`✅ Step 1 completed: Media description created with ID: ${mediaDescriptionId}`);

      // SEASON CLEANUP: If this was a season upload with temporary episode name, clean it up
      if (descriptionData._needsSeasonCleanup) {
        await this.cleanupSeasonUpload(mediaDescriptionId, seasonId, descriptionData._seasonName, authResult.token);
      }

      // Log backend response to see which fields were actually saved
      if (createResponse.data) {
        this.logger.info(chalk.green('\n🔍 Backend Response Analysis:'));

        // Check array fields in the response - only backend-supported fields
        const responseArrayFields = [
          'actor_names', 'director_names', 'producer_names', 'author_names',
          'human_keywords_text_list', 'seo_keywords_text_list',
          'audience_category_names', 'eligible_plan_names', 'available_country_names',
          'theme_names'
        ];
        responseArrayFields.forEach(field => {
          if (createResponse.data[field]) {
            this.logger.info(chalk.yellow(`✅ ${field}: ${JSON.stringify(createResponse.data[field])} (saved as: ${Array.isArray(createResponse.data[field]) ? 'array' : typeof createResponse.data[field]})`));
          } else {
            this.logger.info(chalk.red(`❌ ${field}: not found in response`));
          }
        });

        // Check other supported fields
        const responseOtherFields = [
          'production_year', 'seo_title', 'seo_description', 'external_identifier_text',
          'contract_start_date_utc', 'contract_end_date_utc', 'original_broadcast_date_utc'
        ];
        responseOtherFields.forEach(field => {
          if (createResponse.data[field]) {
            this.logger.info(chalk.yellow(`✅ ${field}: "${createResponse.data[field]}"`));
          } else {
            this.logger.info(chalk.red(`❌ ${field}: not found in response`));
          }
        });

        this.logger.info(chalk.gray('====================================\n'));
      }
      
      // STEP 2: Patch media description with all asset IDs
      this.logger.info('Step 2: Patching media description with asset IDs...');
      const assetData = this.mapAssetsToApiSchema(uploadedImages, videoAssets, mediaDescriptionId);
      
      if (Object.keys(assetData).length === 0) {
        this.logger.warn('No asset IDs to patch - returning with text-only description');
        return {
          success: true,
          id: mediaDescriptionId,
          data: createResponse.data,
          patchSkipped: true
        };
      }
      
      const patchUrl = this.forceIPv4Url(`${this.config.backend.baseUrl}/api/v1/media-descriptions/${mediaDescriptionId}`);
      
      this.logger.info(`Patching media description via API: ${patchUrl}`);
      this.logger.info(`Asset patch payload keys: ${Object.keys(assetData).join(', ')}`);
      
      // Log asset field mappings
      const imageFields = Object.keys(assetData).filter(key => key.startsWith('image_'));
      const videoFields = Object.keys(assetData).filter(key => key.includes('video') || key.includes('file_id'));
      
      if (imageFields.length > 0) {
        this.logger.info(`Image fields in patch payload (${imageFields.length}):`, {
          fields: imageFields.map(field => `${field}: "${assetData[field]}"`)
        });
      }
      
      if (videoFields.length > 0) {
        this.logger.info(`Video fields in patch payload (${videoFields.length}):`, {
          fields: videoFields.map(field => `${field}: "${assetData[field]}"`)
        });
      }
      
      // Make PATCH API call to add asset IDs
      const patchResponse = await axios.patch(
        patchUrl,
        assetData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authResult.token}`
          },
          timeout: 30000
        }
      );
      
      if (patchResponse.status === 200 || patchResponse.status === 204) {
        this.logger.info(`✅ Step 2 completed: Media description patched successfully`);
        return {
          success: true,
          id: mediaDescriptionId,
          data: patchResponse.data || createResponse.data,
          patchSucceeded: true
        };
      } else {
        this.logger.error(`Step 2 failed: PATCH returned status ${patchResponse.status}`);
        return {
          success: false,
          error: `Asset patching failed with status ${patchResponse.status}`,
          id: mediaDescriptionId, // Return the created ID even if patch failed
          response: patchResponse.data,
          createSucceeded: true,
          patchFailed: true
        };
      }
      
    } catch (error) {
      this.logger.error(`Media description creation/patching failed: ${error.message}`);
      
      if (error.response) {
        this.logger.error(`API Response Status: ${error.response.status}`);
        this.logger.error(`API Response Headers: ${JSON.stringify(error.response.headers)}`);
        this.logger.error(`API Response Data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        this.logger.error(`No response received. Request details: ${JSON.stringify({
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        })}`);
      }
      
      return {
        success: false,
        error: error.message,
        details: error.response?.data,
        statusCode: error.response?.status
      };
    }
  }

  /**
   * Map Excel description data to API schema (text-only fields, no asset IDs)
   */
  mapExcelToApiSchemaTextOnly(descriptionData) {
    const apiData = {
      // Required fields
      episode_title: descriptionData.episode_title,
      media_type: descriptionData.media_type?.toLowerCase() || 'video',
    };

    // Optional fields from Excel
    if (descriptionData.program_name) apiData.program_name = descriptionData.program_name;
    if (descriptionData.season_name) {
      apiData.season_name = descriptionData.season_name;
    } else if (descriptionData.program_name) {
      // If season is empty but program exists, copy program to season
      apiData.season_name = descriptionData.program_name;
    }
    if (descriptionData.episode_number) apiData.episode_number = parseInt(descriptionData.episode_number);
    if (descriptionData.descriptive_summary_text) apiData.descriptive_summary_text = descriptionData.descriptive_summary_text;
    if (descriptionData.synopsis_text) apiData.synopsis_text = descriptionData.synopsis_text;
    if (descriptionData.slug) apiData.slug = descriptionData.slug;
    
    // Handle media categories (semicolon-separated) - map to valid enum values
    if (descriptionData.media_categories) {
      const categories = this.splitSemicolonSeparatedList(descriptionData.media_categories);
      
      // Map user-friendly categories to backend enum values
      const categoryMapping = {
        'movie': 'movie',
        'film': 'movie',
        'drama': 'drama', 
        'short drama': 'short-drama',
        'short-drama': 'short-drama',
        'musical': 'musical',
        'music': 'musical',
        'animation': 'animation',
        'animated': 'animation',
        'cartoon': 'animation',
        'documentary': 'documentary',
        'docu': 'documentary',
        'tv show': 'tvshow',
        'tvshow': 'tvshow',
        'tv': 'tvshow',
        'television': 'tvshow',
        'series': 'tvshow',
        'other': 'other'
      };
      
      apiData.media_categories_list = categories
        .map(cat => {
          const normalized = cat.toLowerCase().trim();
          const mapped = categoryMapping[normalized];
          if (mapped) {
            return mapped;
          } else {
            this.logger?.warn(`Unknown media category "${cat}" - mapping to "other"`);
            return 'other';
          }
        })
        .filter((cat, index, arr) => arr.indexOf(cat) === index); // Remove duplicates
    }

    // Handle themes (semicolon-separated)
    if (descriptionData.media_themes) {
      this.logger.info(chalk.cyan('🔍 THEMES DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${descriptionData.media_themes}"`));

      const themes = this.splitSemicolonSeparatedList(descriptionData.media_themes);

      this.logger.info(chalk.gray(`  After splitting: ${JSON.stringify(themes)}`));
      this.logger.info(chalk.gray(`  Final array length: ${themes.length}`));

      apiData.theme_names = themes;

      this.logger.info(`Themes mapped to backend:`, {
        fieldName: 'theme_names',
        values: themes,
        count: themes.length
      });
    } else {
      this.logger.info(chalk.yellow('⚠️  No themes data found in Excel'));
    }

    // Handle actors (semicolon-separated) - Backend expects 'actor_names' only
    if (descriptionData.actors_id_list || descriptionData.actor_ids) {
      // Support both old field name and new field name during transition
      const actorsData = descriptionData.actor_ids || descriptionData.actors_id_list;

      this.logger.info(chalk.cyan('🔍 ACTORS DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${actorsData}"`));
      this.logger.info(chalk.gray(`  Data type: ${typeof actorsData}`));
      this.logger.info(chalk.gray(`  Is array: ${Array.isArray(actorsData)}`));

      const actors = Array.isArray(actorsData)
        ? actorsData
        : this.splitSemicolonSeparatedList(actorsData);

      this.logger.info(chalk.gray(`  After splitting: ${JSON.stringify(actors)}`));
      this.logger.info(chalk.gray(`  Final array length: ${actors.length}`));
      this.logger.info(chalk.gray(`  Each item: ${actors.map(a => `"${a}" (${typeof a})`).join(', ')}`));

      // Backend /from-text endpoint expects exactly 'actor_names' as array
      apiData.actor_names = actors;

      this.logger.info(`Actors mapped to backend:`, {
        fieldName: 'actor_names',
        values: actors,
        count: actors.length,
        sourceField: descriptionData.actors_id_list ? 'actors_id_list' : 'actor_ids'
      });
    } else {
      this.logger.info(chalk.yellow('⚠️  No actors data found in Excel'));
    }

    // Handle directors (semicolon-separated) - Backend expects 'director_names' only
    if (descriptionData.directors_id_list || descriptionData.director_ids) {
      // Support both old field name and new field name during transition
      const directorsData = descriptionData.director_ids || descriptionData.directors_id_list;

      this.logger.info(chalk.cyan('🔍 DIRECTORS DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${directorsData}"`));
      this.logger.info(chalk.gray(`  Data type: ${typeof directorsData}`));

      const directors = Array.isArray(directorsData)
        ? directorsData
        : this.splitSemicolonSeparatedList(directorsData);

      this.logger.info(chalk.gray(`  After splitting: ${JSON.stringify(directors)}`));
      this.logger.info(chalk.gray(`  Final array length: ${directors.length}`));

      // Backend /from-text endpoint expects exactly 'director_names' as array
      apiData.director_names = directors;

      this.logger.info(`Directors mapped to backend:`, {
        fieldName: 'director_names',
        values: directors,
        count: directors.length,
        sourceField: descriptionData.directors_id_list ? 'directors_id_list' : 'director_ids'
      });
    } else {
      this.logger.info(chalk.yellow('⚠️  No directors data found in Excel'));
    }

    // Handle producers (semicolon-separated) - Legacy Excel uses 'productors_id_list'
    if (descriptionData.productors_id_list || descriptionData.producer_ids) {
      // Support legacy Excel field name 'productors_id_list' and map to backend 'producer_names'
      const producersData = descriptionData.productors_id_list || descriptionData.producer_ids;

      this.logger.info(chalk.cyan('🔍 PRODUCERS DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${producersData}"`));
      this.logger.info(chalk.gray(`  Source field: ${descriptionData.productors_id_list ? 'productors_id_list (legacy)' : 'producer_ids'}`));

      const producers = Array.isArray(producersData)
        ? producersData
        : this.splitSemicolonSeparatedList(producersData);

      this.logger.info(chalk.gray(`  After splitting: ${JSON.stringify(producers)}`));
      this.logger.info(chalk.gray(`  Final array length: ${producers.length}`));

      // Backend /from-text endpoint expects exactly 'producer_names' as array
      apiData.producer_names = producers;

      this.logger.info(`Producers mapped to backend:`, {
        sourceField: descriptionData.productors_id_list ? 'productors_id_list (legacy)' : 'producer_ids',
        targetField: 'producer_names',
        values: producers,
        count: producers.length
      });
    } else {
      this.logger.info(chalk.yellow('⚠️  No producers data found in Excel'));
    }

    // Handle authors (semicolon-separated) - Backend expects 'author_names' only
    if (descriptionData.authors_id_list || descriptionData.author_ids) {
      // Support both old field name and new field name during transition
      const authorsData = descriptionData.author_ids || descriptionData.authors_id_list;

      this.logger.info(chalk.cyan('🔍 AUTHORS DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${authorsData}"`));

      const authors = Array.isArray(authorsData)
        ? authorsData
        : this.splitSemicolonSeparatedList(authorsData);

      this.logger.info(chalk.gray(`  After splitting: ${JSON.stringify(authors)}`));
      this.logger.info(chalk.gray(`  Final array length: ${authors.length}`));

      // Backend /from-text endpoint expects exactly 'author_names' as array
      apiData.author_names = authors;

      this.logger.info(`Authors mapped to backend:`, {
        fieldName: 'author_names',
        values: authors,
        count: authors.length
      });
    } else {
      this.logger.info(chalk.yellow('⚠️  No authors data found in Excel'));
    }

    // Handle original languages (semicolon-separated) - Backend expects 'original_language_names'
    if (descriptionData.original_languages_list || descriptionData.original_languages || descriptionData.original_language) {
      const originalLanguagesData = descriptionData.original_languages_list || descriptionData.original_languages || descriptionData.original_language;

      this.logger.info(chalk.cyan('🔍 ORIGINAL LANGUAGES DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${originalLanguagesData}"`));
      this.logger.info(chalk.gray(`  Source field: ${descriptionData.original_languages_list ? 'original_languages_list' : descriptionData.original_languages ? 'original_languages' : 'original_language (singular)'}`));

      const originalLanguages = Array.isArray(originalLanguagesData)
        ? originalLanguagesData
        : this.splitSemicolonSeparatedList(originalLanguagesData);

      // Apply language normalization to handle gender forms and common variations
      const normalizedOriginalLanguages = originalLanguages.map(lang => this.normalizeLanguage(lang));

      this.logger.info(chalk.gray(`  After splitting: ${JSON.stringify(originalLanguages)}`));
      this.logger.info(chalk.gray(`  After normalization: ${JSON.stringify(normalizedOriginalLanguages)}`));
      this.logger.info(chalk.gray(`  Final array length: ${normalizedOriginalLanguages.length}`));

      // Backend /from-text endpoint expects exactly 'original_language_names' as array
      apiData.original_language_names = normalizedOriginalLanguages;

      this.logger.info(`Original languages mapped to backend:`, {
        sourceField: descriptionData.original_languages_list ? 'original_languages_list' : descriptionData.original_languages ? 'original_languages' : 'original_language (singular)',
        fieldName: 'original_language_names',
        values: normalizedOriginalLanguages,
        count: normalizedOriginalLanguages.length
      });
    } else {
      this.logger.info(chalk.yellow('⚠️  No original languages data found in Excel'));
    }

    // Handle available subtitle languages (semicolon-separated) - Backend expects 'available_subtitle_language_names'
    if (descriptionData.available_subtitle_languages_list || descriptionData.available_subtitle_languages) {
      const subtitleLanguagesData = descriptionData.available_subtitle_languages_list || descriptionData.available_subtitle_languages;

      this.logger.info(chalk.cyan('🔍 SUBTITLE LANGUAGES DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${subtitleLanguagesData}"`));

      const subtitleLanguages = Array.isArray(subtitleLanguagesData)
        ? subtitleLanguagesData
        : this.splitSemicolonSeparatedList(subtitleLanguagesData);

      // Apply language normalization to handle gender forms and common variations
      const normalizedSubtitleLanguages = subtitleLanguages.map(lang => this.normalizeLanguage(lang));

      this.logger.info(chalk.gray(`  After splitting: ${JSON.stringify(subtitleLanguages)}`));
      this.logger.info(chalk.gray(`  After normalization: ${JSON.stringify(normalizedSubtitleLanguages)}`));
      this.logger.info(chalk.gray(`  Final array length: ${normalizedSubtitleLanguages.length}`));

      // Backend /from-text endpoint expects exactly 'available_subtitle_language_names' as array
      apiData.available_subtitle_language_names = normalizedSubtitleLanguages;

      this.logger.info(`Subtitle languages mapped to backend:`, {
        fieldName: 'available_subtitle_language_names',
        values: normalizedSubtitleLanguages,
        count: normalizedSubtitleLanguages.length
      });
    } else {
      this.logger.info(chalk.yellow('⚠️  No subtitle languages data found in Excel'));
    }

    // Handle available audio languages (semicolon-separated) - Backend expects 'available_audio_language_names'
    if (descriptionData.available_audio_languages_list || descriptionData.available_audio_languages) {
      const audioLanguagesData = descriptionData.available_audio_languages_list || descriptionData.available_audio_languages;

      this.logger.info(chalk.cyan('🔍 AUDIO LANGUAGES DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${audioLanguagesData}"`));

      const audioLanguages = Array.isArray(audioLanguagesData)
        ? audioLanguagesData
        : this.splitSemicolonSeparatedList(audioLanguagesData);

      // Apply language normalization to handle gender forms and common variations
      const normalizedAudioLanguages = audioLanguages.map(lang => this.normalizeLanguage(lang));

      this.logger.info(chalk.gray(`  After splitting: ${JSON.stringify(audioLanguages)}`));
      this.logger.info(chalk.gray(`  After normalization: ${JSON.stringify(normalizedAudioLanguages)}`));
      this.logger.info(chalk.gray(`  Final array length: ${normalizedAudioLanguages.length}`));

      // Backend /from-text endpoint expects exactly 'available_audio_language_names' as array
      apiData.available_audio_language_names = normalizedAudioLanguages;

      this.logger.info(`Audio languages mapped to backend:`, {
        fieldName: 'available_audio_language_names',
        values: normalizedAudioLanguages,
        count: normalizedAudioLanguages.length
      });
    } else {
      this.logger.info(chalk.yellow('⚠️  No audio languages data found in Excel'));
    }

    // Handle available countries (semicolon-separated) - Backend expects 'available_country_names'
    if (descriptionData.available_countries_id_list) {
      this.logger.info(chalk.cyan('🔍 COUNTRIES DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${descriptionData.available_countries_id_list}"`));

      const countries = this.splitSemicolonSeparatedList(descriptionData.available_countries_id_list);

      this.logger.info(chalk.gray(`  After splitting: ${JSON.stringify(countries)}`));
      this.logger.info(chalk.gray(`  Final array length: ${countries.length}`));

      // Backend /from-text endpoint expects exactly 'available_country_names' as array
      apiData.available_country_names = countries;

      this.logger.info(`Available countries mapped to backend:`, {
        fieldName: 'available_country_names',
        values: countries,
        count: countries.length
      });
    } else {
      this.logger.info(chalk.yellow('⚠️  No countries data found in Excel'));
    }

    // Handle audience categories (semicolon-separated) - Backend expects 'audience_category_names'
    if (descriptionData.audience_categories_id_list) {
      this.logger.info(chalk.cyan('🔍 AUDIENCE CATEGORIES DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${descriptionData.audience_categories_id_list}"`));

      const audienceCategories = this.splitSemicolonSeparatedList(descriptionData.audience_categories_id_list);

      this.logger.info(chalk.gray(`  After splitting: ${JSON.stringify(audienceCategories)}`));
      this.logger.info(chalk.gray(`  Final array length: ${audienceCategories.length}`));

      // Backend /from-text endpoint expects exactly 'audience_category_names' as array
      apiData.audience_category_names = audienceCategories;

      this.logger.info(`Audience categories mapped to backend:`, {
        fieldName: 'audience_category_names',
        values: audienceCategories,
        count: audienceCategories.length
      });
    } else {
      this.logger.info(chalk.yellow('⚠️  No audience categories data found in Excel'));
    }

    // Handle eligible plans (semicolon-separated) - Backend expects 'eligible_plan_names'
    if (descriptionData.eligible_plans_id_list) {
      this.logger.info(chalk.cyan('🔍 ELIGIBLE PLANS DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${descriptionData.eligible_plans_id_list}"`));

      const eligiblePlans = this.splitSemicolonSeparatedList(descriptionData.eligible_plans_id_list);

      this.logger.info(chalk.gray(`  After splitting: ${JSON.stringify(eligiblePlans)}`));
      this.logger.info(chalk.gray(`  Final array length: ${eligiblePlans.length}`));

      // Backend /from-text endpoint expects exactly 'eligible_plan_names' as array
      apiData.eligible_plan_names = eligiblePlans;

      this.logger.info(`Eligible plans mapped to backend:`, {
        fieldName: 'eligible_plan_names',
        values: eligiblePlans,
        count: eligiblePlans.length
      });
    } else {
      this.logger.info(chalk.yellow('⚠️  No eligible plans data found in Excel'));
    }

    // Handle hashtags (semicolon-separated)
    if (descriptionData.hashtags_text_list) {
      const hashtags = this.splitSemicolonSeparatedList(descriptionData.hashtags_text_list);
      apiData.hashtags_text_list = hashtags;
    }

    // Handle tags (semicolon-separated) - Support legacy Excel field 'hashtags_id_list' and map to backend 'tags'
    if (descriptionData.hashtags_id_list || descriptionData.tags) {
      // Support legacy Excel field name 'hashtags_id_list' and map to backend 'tags'
      const tagsData = descriptionData.hashtags_id_list || descriptionData.tags;

      this.logger.info(chalk.cyan('🔍 TAGS DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${tagsData}"`));
      this.logger.info(chalk.gray(`  Source field: ${descriptionData.hashtags_id_list ? 'hashtags_id_list (legacy)' : 'tags'}`));

      const tags = Array.isArray(tagsData)
        ? tagsData
        : this.splitSemicolonSeparatedList(tagsData);

      this.logger.info(chalk.gray(`  Parsed tags: [${tags.join(', ')}]`));
      this.logger.info(chalk.gray(`  Tags count: ${tags.length}`));

      // Backend /from-text endpoint expects exactly 'tags' as array
      apiData.tags = tags;

      this.logger.info(`Tags mapped to backend:`, {
        sourceField: descriptionData.hashtags_id_list ? 'hashtags_id_list (legacy)' : 'tags',
        targetField: 'tags',
        values: tags,
        count: tags.length
      });
    } else {
      this.logger.info(chalk.yellow('⚠️  No tags data found in Excel'));
    }

    // Handle keywords (semicolon-separated) - Backend expects 'human_keywords_text_list'
    if (descriptionData.human_keywords_text_list) {
      const keywords = this.splitSemicolonSeparatedList(descriptionData.human_keywords_text_list);
      // Backend /from-text endpoint expects exactly 'human_keywords_text_list' as array
      // Note: 'tags' field does not exist in backend schema, removed
      apiData.human_keywords_text_list = keywords;

      this.logger.info(`Human keywords mapped to backend:`, {
        fieldName: 'human_keywords_text_list',
        values: keywords,
        count: keywords.length
      });
    }

    // Handle SEO keywords (semicolon-separated) - Backend expects 'seo_keywords_text_list'
    if (descriptionData.seo_keywords_text_list) {
      const seoKeywords = this.splitSemicolonSeparatedList(descriptionData.seo_keywords_text_list);

      // Backend /from-text endpoint expects exactly 'seo_keywords_text_list' as array
      apiData.seo_keywords_text_list = seoKeywords;

      this.logger.info(`SEO keywords mapped to backend:`, {
        fieldName: 'seo_keywords_text_list',
        values: seoKeywords,
        count: seoKeywords.length
      });
    }

    // Handle rights holder
    if (descriptionData.rights_holder) {
      apiData.rights_holder = descriptionData.rights_holder;
    }

    // Handle copyright owner text
    if (descriptionData.copyright_owner_text) {
      apiData.copyright_owner_text = descriptionData.copyright_owner_text;
    }

    // Handle origin countries (backend supports origin_country_names)
    if (descriptionData.origin_countries_list || descriptionData.origin_countries || descriptionData.origin_country || descriptionData.origin_country_name) {
      const originCountriesData = descriptionData.origin_countries_list || descriptionData.origin_countries || descriptionData.origin_country || descriptionData.origin_country_name;

      this.logger.info(chalk.cyan('🔍 ORIGIN COUNTRIES DEBUG:'));
      this.logger.info(chalk.gray(`  Raw Excel data: "${originCountriesData}"`));
      this.logger.info(chalk.gray(`  Source field: ${descriptionData.origin_countries_list ? 'origin_countries_list' : descriptionData.origin_countries ? 'origin_countries' : descriptionData.origin_country ? 'origin_country' : 'origin_country_name'}`));

      const originCountries = Array.isArray(originCountriesData)
        ? originCountriesData
        : this.splitSemicolonSeparatedList(originCountriesData);

      this.logger.info(chalk.gray(`  After splitting: ${JSON.stringify(originCountries)}`));
      this.logger.info(chalk.gray(`  Final array length: ${originCountries.length}`));

      // Backend /from-text endpoint expects exactly 'origin_country_names' as array
      apiData.origin_country_names = originCountries;

      this.logger.info(`Origin countries mapped to backend:`, {
        sourceField: descriptionData.origin_countries_list ? 'origin_countries_list' : descriptionData.origin_countries ? 'origin_countries' : descriptionData.origin_country ? 'origin_country' : 'origin_country_name',
        fieldName: 'origin_country_names',
        values: originCountries,
        count: originCountries.length
      });
    } else {
      // No origin country provided - use default value "Corée du Sud"
      this.logger.info(chalk.cyan('🔍 ORIGIN COUNTRIES DEBUG:'));
      this.logger.info(chalk.yellow('  No origin country data found in Excel - using default'));
      this.logger.info(chalk.gray(`  Default value: "Corée du Sud"`));

      // Backend /from-text endpoint expects exactly 'origin_country_names' as array
      apiData.origin_country_names = ["Corée du Sud"];

      this.logger.info(`Origin countries mapped to backend (default):`, {
        sourceField: 'default (no data provided)',
        fieldName: 'origin_country_names',
        values: ["Corée du Sud"],
        count: 1
      });
    }

    // Original languages are now handled above in the main mapping section

    // Handle diffusion date - NOT SUPPORTED by backend /from-text endpoint
    if (descriptionData.diffusion_date || descriptionData.date_diffusion) {
      this.logger.warn(`Diffusion date field found but not supported by backend /from-text endpoint:`, {
        value: descriptionData.diffusion_date || descriptionData.date_diffusion
      });
    }

    // Handle contact date - NOT SUPPORTED by backend /from-text endpoint
    if (descriptionData.contact_date || descriptionData.date_contact) {
      this.logger.warn(`Contact date field found but not supported by backend /from-text endpoint:`, {
        value: descriptionData.contact_date || descriptionData.date_contact
      });
    }

    // Handle audience category - Individual field NOT SUPPORTED (use audience_category_names array instead)
    if (descriptionData.audience_category) {
      this.logger.warn(`Individual audience_category field found but not supported by backend /from-text endpoint. Use audience_categories_id_list instead:`, {
        value: descriptionData.audience_category
      });
    }

    // Handle production year - Backend expects exact field name 'production_year'
    if (descriptionData.production_year) {
      const year = parseInt(descriptionData.production_year);
      apiData.production_year = year;

      this.logger.info(`Production year mapped to backend:`, {
        fieldName: 'production_year',
        value: year
      });
    }

    // Handle eligible plan - Individual field NOT SUPPORTED (use eligible_plan_names array instead)
    if (descriptionData.eligible_plan) {
      this.logger.warn(`Individual eligible_plan field found but not supported by backend /from-text endpoint. Use eligible_plans_id_list instead:`, {
        value: descriptionData.eligible_plan
      });
    }

    // Handle SEO fields - Backend supports exact field names only
    if (descriptionData.seo_title) {
      apiData.seo_title = descriptionData.seo_title;
      this.logger.info(`SEO title mapped to backend:`, { fieldName: 'seo_title', value: descriptionData.seo_title });
    }
    if (descriptionData.seo_description) {
      apiData.seo_description = descriptionData.seo_description;
      this.logger.info(`SEO description mapped to backend:`, { fieldName: 'seo_description', value: descriptionData.seo_description });
    }

    // Handle external identifier - Backend expects 'external_identifier_text'
    if (descriptionData.external_identifier || descriptionData.external_identifier_text) {
      const externalId = descriptionData.external_identifier_text || descriptionData.external_identifier;
      apiData.external_identifier_text = externalId;
      this.logger.info(`External identifier mapped to backend:`, { fieldName: 'external_identifier_text', value: externalId });
    }

    // Handle contract dates - Backend expects exact field names with '_utc' suffix
    if (descriptionData.contract_start_date || descriptionData.contract_start_date_utc) {
      const dateValue = descriptionData.contract_start_date_utc || descriptionData.contract_start_date;
      const normalizedDate = this.parseAndNormalizeDate(dateValue);
      if (normalizedDate) {
        apiData.contract_start_date_utc = normalizedDate;
        this.logger.info(`Contract start date mapped to backend:`, { fieldName: 'contract_start_date_utc', value: normalizedDate });
      }
    }
    if (descriptionData.contract_end_date || descriptionData.contract_end_date_utc) {
      const dateValue = descriptionData.contract_end_date_utc || descriptionData.contract_end_date;
      const normalizedDate = this.parseAndNormalizeDate(dateValue);
      if (normalizedDate) {
        apiData.contract_end_date_utc = normalizedDate;
        this.logger.info(`Contract end date mapped to backend:`, { fieldName: 'contract_end_date_utc', value: normalizedDate });
      }
    }

    // Handle original broadcast date - Backend expects 'original_broadcast_date_utc'
    if (descriptionData.original_broadcast_time || descriptionData.original_broadcast_date_utc) {
      const dateValue = descriptionData.original_broadcast_date_utc || descriptionData.original_broadcast_time;
      const normalizedDate = this.parseAndNormalizeDate(dateValue);
      if (normalizedDate) {
        apiData.original_broadcast_date_utc = normalizedDate;
        this.logger.info(`Original broadcast date mapped to backend:`, { fieldName: 'original_broadcast_date_utc', value: normalizedDate });
      }
    }

    return apiData;
  }

  /**
   * Map uploaded assets (images and videos) to API schema for PATCH request
   */
  mapAssetsToApiSchema(uploadedImages, videoAssets, mediaDescriptionId) {
    const assetData = {};

    // Associate uploaded images by dimensions (from Excel mapping)
    this.logger.info(`Processing ${uploadedImages.length} uploaded images for asset mapping`);
    uploadedImages.forEach(image => {
      const dimensions = image.dimensions; // From Excel mapping, not filename guessing
      if (dimensions && image.pictureId) {
        const fieldName = `image_${dimensions.replace('x', '_')}_id`;
        assetData[fieldName] = image.pictureId;
        this.logger.info(`Mapped image field from Excel: ${image.fileName} -> ${fieldName} = "${image.pictureId}" (dimension: ${dimensions})`);
      } else {
        this.logger.warn(`Image missing Excel dimension mapping or picture ID - skipping: "${image.fileName}" (dimensions: ${dimensions}, pictureId: ${image.pictureId})`);
      }
    });

    // Set main video file ID if available
    const mainVideoAsset = videoAssets.find(asset => asset.isMainVideo);
    if (mainVideoAsset && mainVideoAsset.result?.backend_record?.uuid) {
      assetData.main_video_file_id = mainVideoAsset.result.backend_record.uuid;
      this.logger.info(`Mapped main video field: main_video_file_id = "${mainVideoAsset.result.backend_record.uuid}"`);
    }

    // Get trailer and excerpt video file IDs for relationships
    const trailerAssets = videoAssets.filter(asset => asset.type.toLowerCase().includes('trailer'));
    const excerptAssets = videoAssets.filter(asset => asset.type.toLowerCase().includes('extract') || asset.type.toLowerCase().includes('excerpt'));

    if (trailerAssets.length > 0) {
      assetData.trailer_ids = trailerAssets
        .filter(asset => asset.result?.backend_record?.uuid)
        .map(asset => asset.result.backend_record.uuid);
      this.logger.info(`Mapped trailer IDs: ${assetData.trailer_ids.join(', ')}`);
    }

    if (excerptAssets.length > 0) {
      assetData.excerpt_ids = excerptAssets
        .filter(asset => asset.result?.backend_record?.uuid)
        .map(asset => asset.result.backend_record.uuid);
      this.logger.info(`Mapped excerpt IDs: ${assetData.excerpt_ids.join(', ')}`);
    }

    // Add friendly URL using media_description ID
    if (mediaDescriptionId) {
      assetData.friendly_url = `https://www.kyool.eu/video/${mediaDescriptionId}`;
      this.logger.info(`Generated friendly URL: ${assetData.friendly_url}`);
    }

    return assetData;
  }

  /**
   * Get or create a season by name
   */
  async getOrCreateSeason(seasonName, programId = null) {
    try {
      const authResult = await this.authenticateWithBackend();
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }

      // Search for existing season
      const searchUrl = this.forceIPv4Url(
        `${this.config.backend.baseUrl}/api/v1/seasons?q=${encodeURIComponent(seasonName)}&limit=50`
      );

      this.logger.info(chalk.gray(`  Searching for season: "${seasonName}"`));

      const searchResponse = await axios.get(searchUrl, {
        headers: { 'Authorization': `Bearer ${authResult.token}` },
        timeout: 30000
      });

      const existingSeasons = searchResponse.data.data || [];
      let season = existingSeasons.find(s =>
        s.season_name && s.season_name.toLowerCase() === seasonName.toLowerCase()
      );

      if (season) {
        this.logger.info(chalk.green(`  ✅ Using existing season: ${season.season_name} (ID: ${season.id})`));
        return season;
      }

      // Create new season
      this.logger.info(chalk.yellow(`  Creating new season: ${seasonName}`));

      const createUrl = this.forceIPv4Url(`${this.config.backend.baseUrl}/api/v1/seasons`);

      const seasonData = {
        season_name: seasonName,
        season_number: 1 // Default
      };

      if (programId) {
        seasonData.program_id = programId;
      }

      const createResponse = await axios.post(createUrl, seasonData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authResult.token}`
        },
        timeout: 30000
      });

      season = createResponse.data;
      this.logger.info(chalk.green(`  ✅ Created season: ${season.season_name} (ID: ${season.id})`));

      return season;

    } catch (error) {
      this.logger.error(`Season get/create failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up season upload by removing temporary episode name and fixing relationships
   */
  async cleanupSeasonUpload(mediaDescriptionId, seasonId, seasonName, authToken) {
    try {
      this.logger.info(chalk.cyan(`🧹 Cleaning up season upload for: ${seasonName}`));

      // Step 1: Update media description to remove season_id and set proper episode_title
      const mediaDescriptionUpdateUrl = this.forceIPv4Url(
        `${this.config.backend.baseUrl}/api/v1/media-descriptions/${mediaDescriptionId}`
      );

      const mediaDescriptionUpdate = {
        season_id: null,          // Remove episode-season relationship
        episode_title: seasonName // Use actual season name instead of temporary title
      };

      this.logger.info(chalk.gray(`  • Removing episode-season link and updating title for media description ${mediaDescriptionId}`));
      this.logger.info(chalk.gray(`  • Updating episode_title from temporary value to: "${seasonName}"`));

      const mediaDescriptionResponse = await axios.patch(mediaDescriptionUpdateUrl, mediaDescriptionUpdate, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        timeout: 30000
      });

      if (mediaDescriptionResponse.status === 200 || mediaDescriptionResponse.status === 204) {
        this.logger.info(chalk.green(`  ✅ Media description cleaned up: episode_title set to "${seasonName}"`));
      } else {
        this.logger.info(chalk.red(`  ❌ Failed to clean up media description (status: ${mediaDescriptionResponse.status})`));
      }

      // Step 2: Update season to link this media description as the season description
      const seasonUpdateUrl = this.forceIPv4Url(
        `${this.config.backend.baseUrl}/api/v1/seasons/${seasonId}`
      );

      const seasonUpdate = {
        general_media_description_id: mediaDescriptionId
      };

      this.logger.info(chalk.gray(`  • Linking media description ${mediaDescriptionId} as season description for season ${seasonId}`));

      const seasonResponse = await axios.put(seasonUpdateUrl, seasonUpdate, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        timeout: 30000
      });

      if (seasonResponse.status === 200 || seasonResponse.status === 204) {
        this.logger.info(chalk.green(`  ✅ Season description relationship established successfully`));
        this.logger.info(chalk.cyan(`🎯 Season cleanup completed: "${seasonName}" now has proper description relationship`));
      } else {
        this.logger.info(chalk.red(`  ❌ Failed to establish season description relationship (status: ${seasonResponse.status})`));
      }

    } catch (error) {
      this.logger.info(chalk.red(`❌ Season cleanup failed: ${error.message}`));
      this.logger.error(`Season cleanup failed for ${seasonName}: ${error.message}`);

      if (error.response) {
        this.logger.error(`API Response Status: ${error.response.status}`);
        this.logger.error(`API Response Data: ${JSON.stringify(error.response.data)}`);
      }

      // Don't throw - cleanup failure shouldn't break the main upload flow
      this.logger.info(chalk.yellow(`⚠️  Season upload completed but cleanup failed - manual cleanup may be needed`));
    }
  }

  /**
   * Get or create a program by name
   */
  async getOrCreateProgram(programName) {
    try {
      const authResult = await this.authenticateWithBackend();
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }

      // Search for existing program
      const searchUrl = this.forceIPv4Url(
        `${this.config.backend.baseUrl}/api/v1/programs?q=${encodeURIComponent(programName)}&limit=50`
      );

      this.logger.info(chalk.gray(`  Searching for program: "${programName}"`));

      const searchResponse = await axios.get(searchUrl, {
        headers: { 'Authorization': `Bearer ${authResult.token}` },
        timeout: 30000
      });

      const existingPrograms = searchResponse.data.data || [];
      let program = existingPrograms.find(p =>
        p.program_name && p.program_name.toLowerCase() === programName.toLowerCase()
      );

      if (program) {
        this.logger.info(chalk.green(`  ✅ Using existing program: ${program.program_name} (ID: ${program.id})`));
        return program;
      }

      // Create new program
      this.logger.info(chalk.yellow(`  Creating new program: ${programName}`));

      const createUrl = this.forceIPv4Url(`${this.config.backend.baseUrl}/api/v1/programs`);

      const programData = {
        program_name: programName
      };

      const createResponse = await axios.post(createUrl, programData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authResult.token}`
        },
        timeout: 30000
      });

      program = createResponse.data;
      this.logger.info(chalk.green(`  ✅ Created program: ${program.program_name} (ID: ${program.id})`));

      return program;

    } catch (error) {
      this.logger.error(`Program get/create failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Derive video quality from playback policy
   */
  deriveVideoQualityFromPolicy(policy) {
    const policyStr = Array.isArray(policy) ? policy[0] : policy;
    const normalizedPolicy = policyStr?.toLowerCase();

    if (normalizedPolicy === 'drm' || normalizedPolicy === 'signed') {
      return 'plus';
    } else if (normalizedPolicy === 'public') {
      return 'basic';
    } else {
      throw new Error(`Invalid playback policy: ${policyStr}. Must be 'public', 'signed', or 'drm'`);
    }
  }

  /**
   * Generate temporary config file for mux-upload with proper policy and DRM handling
   */
  async generateMuxUploadConfig(videoFile, entry, descriptionData) {
    // Determine policy based on video type
    let policy;
    let drmConfig = null;
    
    if (entry.type.toLowerCase() === 'video') {
      // Main video - use policy from Description sheet
      policy = descriptionData?.policy ? [descriptionData.policy.toLowerCase()] : ['public'];
      
      // Handle DRM configuration for main video
      if (descriptionData?.policy?.toLowerCase() === 'drm') {
        if (!this.config.drm?.configurationId) {
          throw new Error('DRM policy requires drm.configurationId in configuration file');
        }
        drmConfig = {
          enabled: true,
          configuration_id: this.config.drm.configurationId.toString().trim()
        };
        this.logger.info(`Configuring DRM for main video with configuration ID: ${drmConfig.configuration_id}`);
      }
    } else {
      // Trailers and extracts always use public policy
      policy = ['public'];
      this.logger.info(`Setting public policy for ${entry.type.toLowerCase()}: ${videoFile.name}`);
    }

    // Generate passthrough from episode_title if available
    const passthrough = descriptionData?.episode_title?.toString().trim() ||
                       this.generateVideoTitle(videoFile.name, entry.type);

    const config = {
      video: {
        filepath: videoFile.fullPath,  // Use fullPath instead of path
        title: this.generateVideoTitle(videoFile.name, entry.type)
      },
      metadata: {
        video_type: entry.type.toLowerCase(),
        source_filename: videoFile.name
      },
      auth: {
        mux_token_id: this.config.mux.tokenId,
        mux_token_secret: this.config.mux.tokenSecret
      },
      backend: {
        server_address: this.forceIPv4Url(this.config.backend.baseUrl),
        user: this.config.backend.username,
        password: this.config.backend.password
      },
      settings: {
        playback_policy: policy,  // Decided based on excel input
        video_quality: this.deriveVideoQualityFromPolicy(policy),  // Auto-derived from policy
        normalize_audio: false,  // Always false
        master_access: "none",   // Always "none"
        max_resolution_tier: "1080p",  // Always "1080p"
        passthrough: passthrough
        // Note: mp4_support and encoding_tier are NOT included (don't send)
      },
      logging: {
        enabled: true,
        level: 'info',
        console: false
      }
    };

    // Add DRM config if needed
    if (drmConfig) {
      config.drm = drmConfig;
    }

    this.logger.info(`Generated Mux config for ${videoFile.name}: policy=${policy.join(',')}, passthrough="${passthrough}", drm=${!!drmConfig}`);

    // Ensure temp directory exists before writing config
    await this.ensureTempDirectory();

    const configPath = path.join(this.tempConfigDir, `mux-upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.json`);
    await fs.writeJson(configPath, config, { spaces: 2 });
    return configPath;
  }

  /**
   * Generate temporary config file for picture-upload
   */
  async generatePictureUploadConfig(imageFile) {
    const config = {
      picturePath: imageFile.fullPath,  // Use fullPath instead of path for absolute path
      s3: {
        accessKeyId: this.config.s3.accessKeyId,
        secretAccessKey: this.config.s3.secretAccessKey,
        region: this.config.s3.region,
        bucket: this.config.s3.pictures.bucket,
        keyPrefix: this.config.s3.pictures.keyPrefix
      },
      cloudfront: {
        domain: this.config.s3.cloudfrontDomain || `${this.config.s3.pictures.bucket}.s3.${this.config.s3.region}.amazonaws.com`
      },
      api: this.config.backend,
      metadata: {
        fileName: imageFile.name
      }
    };

    // Ensure temp directory exists before writing config
    await this.ensureTempDirectory();

    const configPath = path.join(this.tempConfigDir, `picture-upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.json`);
    await fs.writeJson(configPath, config, { spaces: 2 });
    return configPath;
  }

  /**
   * Generate temporary config file for subtitle upload
   */
  async generateSubtitleUploadConfig(subtitleFiles, mediaFiles, assetId) {
    const subtitles = subtitleFiles.map(sub => {
      const subtitleFile = mediaFiles.subtitles.find(f => 
        f.name.toLowerCase() === sub.fileName.toLowerCase()
      );
      return {
        language_code: sub.language,
        name: sub.name,
        file_path: subtitleFile ? subtitleFile.fullPath : path.join(process.cwd(), sub.fileName),
        is_default: sub.isDefault || false
      };
    });

    const config = {
      mux_asset_id: assetId,
      subtitles,
      auth: {
        mux_token_id: this.config.mux.tokenId,
        mux_token_secret: this.config.mux.tokenSecret
      },
      s3: {
        access_key_id: this.config.s3.accessKeyId,
        secret_access_key: this.config.s3.secretAccessKey,
        region: this.config.s3.region,
        bucket_name: this.config.s3.subtitles.bucket
      },
      options: {
        cleanup_delay_minutes: 120,
        max_retry_attempts: 3
      },
      logging: {
        enabled: true,
        level: 'info',
        console: false
      }
    };

    // Ensure temp directory exists before writing config
    await this.ensureTempDirectory();

    const configPath = path.join(this.tempConfigDir, `subtitle-upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.json`);
    await fs.writeJson(configPath, config, { spaces: 2 });
    return configPath;
  }


  /**
   * Build files context for error reporting
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
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get human-readable description for network error codes
   */
  getNetworkErrorDescription(errorCode) {
    const descriptions = {
      'ENOTFOUND': 'DNS resolution failed - unable to resolve hostname',
      'ETIMEDOUT': 'Connection timeout - server did not respond in time',
      'ECONNRESET': 'Connection reset - connection was closed unexpectedly',
      'ECONNREFUSED': 'Connection refused - server rejected the connection',
      'EPIPE': 'Broken pipe - connection was terminated',
      'ENETUNREACH': 'Network unreachable - cannot reach the destination network',
      'EHOSTUNREACH': 'Host unreachable - cannot reach the destination host'
    };
    return descriptions[errorCode] || 'Unknown network error';
  }

  /**
   * Generate appropriate title for video based on type
   */
  generateVideoTitle(filename, videoType) {
    // Remove extension and clean up filename
    const baseTitle = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    
    // Add type suffix for non-main videos
    if (videoType && videoType.toLowerCase() !== 'video') {
      const typeLabel = videoType.replace(/video_?/i, '').replace(/[_-]/g, ' ');
      return `${baseTitle} (${typeLabel})`;
    }
    
    return baseTitle;
  }

  /**
   * Cleanup temporary config files
   */
  async cleanupTempConfigs() {
    try {
      if (await fs.pathExists(this.tempConfigDir)) {
        await fs.remove(this.tempConfigDir);
        this.logger.info('Temporary config files cleaned up');
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp configs: ${error.message}`);
    }
  }
}