import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { uploadToMux } from '../../mux-upload/wrapper.js';
import { uploadSubtitlesToMux } from '../../mux-subtitle-upload/wrapper.js';
import { uploadPicture } from '../../picture-upload/wrapper.js';

export class OrchestrationService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.tempConfigDir = path.join(process.cwd(), '.temp-configs');
  }

  async processUploads(excelData, mediaFiles, folderPath) {
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
      console.log(chalk.blue('\n🚀 Processing media uploads...'));
      
      // Ensure temp config directory exists
      await fs.ensureDir(this.tempConfigDir);
      
      // Step 1: Upload main videos to Mux
      console.log(chalk.cyan('📹 Uploading videos to Mux...'));
      const videoResults = await this.uploadVideosToMux(excelData.files, mediaFiles, folderPath, excelData.description);
      results.uploads.videos = videoResults.successes;
      if (videoResults.errors.length > 0) {
        results.errors.push(...videoResults.errors);
      }
      
      // Get main video asset for subtitle upload
      const mainVideoAsset = videoResults.successes.find(v => v.isMainVideo);
      
      if (mainVideoAsset) {
        // Step 2: Upload subtitles to Mux (after main video is ready)
        console.log(chalk.cyan('📝 Uploading subtitles to Mux...'));
        const subtitleResults = await this.uploadSubtitlesToMux(
          excelData.files, 
          mediaFiles, 
          folderPath, 
          mainVideoAsset.assetId
        );
        results.uploads.subtitles = subtitleResults.successes;
        if (subtitleResults.errors.length > 0) {
          results.errors.push(...subtitleResults.errors);
        }
      } else {
        console.log(chalk.yellow('⚠️  No main video uploaded successfully, skipping subtitles'));
        results.errors.push('No main video available for subtitle upload');
      }
      
      // Step 3: Upload images to S3
      console.log(chalk.cyan('🖼️  Uploading images to S3...'));
      const imageResults = await this.uploadImagesToS3(excelData.files, mediaFiles, folderPath);
      results.uploads.images = imageResults.successes;
      if (imageResults.errors.length > 0) {
        results.errors.push(...imageResults.errors);
      }
      
      // Step 4: Create media description via API
      console.log(chalk.cyan('📄 Creating media description...'));
      const apiResult = await this.createMediaDescription(
        excelData.description, 
        results.uploads.images,
        mainVideoAsset
      );
      
      if (apiResult.success) {
        results.mediaDescriptionId = apiResult.id;
        results.success = true;
        console.log(chalk.green(`✅ Media description created with ID: ${apiResult.id}`));
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
    
    // Get video files from Files sheet
    const videoEntries = filesData.filter(file => 
      file.type && file.type.toLowerCase().includes('video') && file.fileName
    );
    
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
        
        console.log(chalk.gray(`  Uploading ${videoFile.name}...`));
        
        const result = await uploadToMux({
          config: configPath,
          verbose: false,
          quiet: true
        });
        
        const isMainVideo = entry.type.toLowerCase() === 'video';
        successes.push({
          fileName: videoFile.name,
          type: entry.type,
          assetId: result.asset.id,
          playbackId: result.asset.playback_ids?.[0]?.id,
          status: result.asset.status,
          isMainVideo,
          result
        });
        
        console.log(chalk.green(`    ✅ ${videoFile.name} uploaded (Asset: ${result.asset.id})`));
        
      } catch (error) {
        const errorMsg = `Failed to upload video ${entry.fileName}: ${error.message}`;
        errors.push(errorMsg);
        console.log(chalk.red(`    ❌ ${entry.fileName}: ${error.message}`));
        this.logger.error(errorMsg);
      }
    }
    
    return { successes, errors };
  }

  async uploadImagesToS3(filesData, mediaFiles, folderPath) {
    const successes = [];
    const errors = [];
    
    // Collect all image files from Files sheet
    const imageFiles = new Set();
    filesData.forEach(file => {
      if (file.poster) imageFiles.add(file.poster);
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
        
        console.log(chalk.gray(`  Uploading ${imageFile.name}...`));
        
        const result = await uploadPicture({
          config: configPath,
          verbose: false
        });
        
        successes.push({
          fileName: imageFile.name,
          s3Url: result.s3.url,
          s3Key: result.s3.key,
          pictureId: result.api.id,
          dimensions: this.guessDimensionsFromFilename(imageFile.name),
          result
        });
        
        console.log(chalk.green(`    ✅ ${imageFile.name} uploaded (ID: ${result.api.id})`));
        
      } catch (error) {
        const errorMsg = `Failed to upload image ${fileName}: ${error.message}`;
        errors.push(errorMsg);
        console.log(chalk.red(`    ❌ ${fileName}: ${error.message}`));
        this.logger.error(errorMsg);
      }
    }
    
    return { successes, errors };
  }

  async uploadSubtitlesToMux(filesData, mediaFiles, folderPath, assetId) {
    const successes = [];
    const errors = [];
    
    // Collect subtitle files from Files sheet
    const subtitleFiles = [];
    filesData.forEach(file => {
      if (file.frSubtitle) subtitleFiles.push({ fileName: file.frSubtitle, language: 'fr', name: 'French' });
      if (file.enSubtitle) subtitleFiles.push({ fileName: file.enSubtitle, language: 'en', name: 'English' });
      if (file.koSubtitle) subtitleFiles.push({ fileName: file.koSubtitle, language: 'ko', name: 'Korean' });
    });
    
    if (subtitleFiles.length === 0) {
      console.log(chalk.gray('  No subtitles to upload'));
      return { successes, errors };
    }
    
    try {
      // Generate config for subtitle upload
      const configPath = await this.generateSubtitleUploadConfig(subtitleFiles, mediaFiles, assetId);
      
      console.log(chalk.gray(`  Uploading ${subtitleFiles.length} subtitle files...`));
      
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
              trackId: res.trackId,
              result: res
            });
            console.log(chalk.green(`    ✅ ${res.subtitle.language_code}: ${res.trackId}`));
          } else {
            errors.push(`Subtitle upload failed (${res.subtitle.language_code}): ${res.error}`);
            console.log(chalk.red(`    ❌ ${res.subtitle.language_code}: ${res.error}`));
          }
        });
      }
      
    } catch (error) {
      const errorMsg = `Subtitle upload process failed: ${error.message}`;
      errors.push(errorMsg);
      console.log(chalk.red(`  ❌ ${errorMsg}`));
      this.logger.error(errorMsg);
    }
    
    return { successes, errors };
  }

  /**
   * Authenticate with backend and get JWT token
   */
  async authenticateWithBackend() {
    try {
      const loginUrl = `${this.config.backend.baseUrl}/api/v1/auth/login`;
      
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

      const apiUrl = `${this.config.backend.baseUrl}/api/v1/media-descriptions`;
      
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
            item.episode_title && item.episode_title.toLowerCase() === descriptionData.episode_title.toLowerCase()
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

  async createMediaDescription(descriptionData, uploadedImages, mainVideoAsset) {
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
      
      // Map Excel data to API schema
      const apiData = this.mapExcelToApiSchema(descriptionData, uploadedImages, mainVideoAsset);
      
      const apiUrl = `${this.config.backend.baseUrl}/api/v1/media-descriptions/from-text`;
      
      this.logger.info(`Creating media description via API: ${apiUrl}`);
      this.logger.info(`Using JWT Bearer token authentication`);
      this.logger.info(`API payload keys: ${Object.keys(apiData).join(', ')}`);
      
      // Make API call to create media description with JWT token
      const response = await axios.post(
        apiUrl,
        apiData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authResult.token}`
          },
          timeout: 30000  // 30 second timeout
        }
      );
      
      if (response.status === 200 || response.status === 201) {
        return {
          success: true,
          id: response.data.id,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: `API returned status ${response.status}`,
          response: response.data
        };
      }
      
    } catch (error) {
      this.logger.error(`Media description creation failed: ${error.message}`);
      
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
   * Map Excel description data to API schema
   */
  mapExcelToApiSchema(descriptionData, uploadedImages, mainVideoAsset) {
    const apiData = {
      // Required fields
      episode_title: descriptionData.episode_title,
      media_type: descriptionData.media_type?.toLowerCase() || 'video',
    };

    // Optional fields from Excel
    if (descriptionData.program_name) apiData.program_name = descriptionData.program_name;
    if (descriptionData.season_name) apiData.season_name = descriptionData.season_name;
    if (descriptionData.episode_number) apiData.episode_number = parseInt(descriptionData.episode_number);
    if (descriptionData.descriptive_summary_text) apiData.descriptive_summary_text = descriptionData.descriptive_summary_text;
    if (descriptionData.synopsis_text) apiData.synopsis_text = descriptionData.synopsis_text;
    if (descriptionData.slug) apiData.slug = descriptionData.slug;
    
    // Handle media categories (semicolon-separated)
    if (descriptionData.media_categories) {
      const categories = descriptionData.media_categories
        .split(';')
        .map(cat => cat.trim())
        .filter(cat => cat.length > 0);
      apiData.media_categories_list = categories.map(cat => cat.toLowerCase().replace(/\s+/g, '-'));
    }

    // Handle themes (semicolon-separated)
    if (descriptionData.media_themes) {
      const themes = descriptionData.media_themes
        .split(';')
        .map(theme => theme.trim())
        .filter(theme => theme.length > 0);
      apiData.theme_names = themes;
    }

    // Handle actors (semicolon-separated)
    if (descriptionData.actors_id_list) {
      const actors = descriptionData.actors_id_list
        .split(';')
        .map(actor => actor.trim())
        .filter(actor => actor.length > 0);
      apiData.actor_names = actors;
    }

    // Handle directors (semicolon-separated)
    if (descriptionData.directors_id_list) {
      const directors = descriptionData.directors_id_list
        .split(';')
        .map(director => director.trim())
        .filter(director => director.length > 0);
      apiData.director_names = directors;
    }

    // Handle producers (semicolon-separated)
    if (descriptionData.productors_id_list) {
      const producers = descriptionData.productors_id_list
        .split(';')
        .map(producer => producer.trim())
        .filter(producer => producer.length > 0);
      apiData.producer_names = producers;
    }

    // Handle authors (semicolon-separated)
    if (descriptionData.authors_id_list) {
      const authors = descriptionData.authors_id_list
        .split(';')
        .map(author => author.trim())
        .filter(author => author.length > 0);
      apiData.author_names = authors;
    }

    // Handle available countries (semicolon-separated)
    if (descriptionData.available_countries_id_list) {
      const countries = descriptionData.available_countries_id_list
        .split(';')
        .map(country => country.trim())
        .filter(country => country.length > 0);
      apiData.available_country_names = countries;
    }

    // Handle hashtags (semicolon-separated)
    if (descriptionData.hashtags_text_list) {
      const hashtags = descriptionData.hashtags_text_list
        .split(';')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      apiData.hashtags_text_list = hashtags;
    }

    // Handle keywords (semicolon-separated)
    if (descriptionData.human_keywords_text_list) {
      const keywords = descriptionData.human_keywords_text_list
        .split(';')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0);
      apiData.human_keywords_text_list = keywords;
    }

    // Associate uploaded images by dimensions
    uploadedImages.forEach(image => {
      const dimensions = image.dimensions;
      if (dimensions) {
        const fieldName = `image_${dimensions.replace('x', '_')}_filename`;
        apiData[fieldName] = image.fileName;
      }
    });

    // Set main video file ID if available
    if (mainVideoAsset && mainVideoAsset.result?.backend_record?.uuid) {
      apiData.main_video_file_id = mainVideoAsset.result.backend_record.uuid;
    }

    return apiData;
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
        if (!descriptionData.drm_configuration_id) {
          throw new Error('DRM policy requires drm_configuration_id in Description sheet');
        }
        drmConfig = {
          enabled: true,
          configuration_id: descriptionData.drm_configuration_id.toString().trim()
        };
        this.logger.info(`Configuring DRM for main video with configuration ID: ${drmConfig.configuration_id}`);
      }
    } else {
      // Trailers and extracts always use public policy
      policy = ['public'];
      this.logger.info(`Setting public policy for ${entry.type.toLowerCase()}: ${videoFile.name}`);
    }

    const config = {
      video: {
        filepath: videoFile.fullPath  // Use fullPath instead of path
      },
      auth: {
        mux_token_id: this.config.mux.tokenId,
        mux_token_secret: this.config.mux.tokenSecret
      },
      backend: {
        server_address: this.config.backend.baseUrl,
        user: this.config.backend.username,
        password: this.config.backend.password
      },
      settings: {
        playback_policy: policy,  // Override with determined policy
        video_quality: this.config.settings.videoQuality || 'basic',
        max_resolution_tier: this.config.settings.maxResolutionTier || '1080p',
        normalize_audio: this.config.settings.normalizeAudio || false,
        master_access: this.config.settings.masterAccess || 'none',
        mp4_support: this.config.settings.mp4Support || 'none',
        cors_origin: this.config.settings.corsOrigin || '*',
        environment_text: this.config.settings.environmentText
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

    this.logger.info(`Generated Mux config for ${videoFile.name}: policy=${policy.join(',')}, drm=${!!drmConfig}`);

    const configPath = path.join(this.tempConfigDir, `mux-upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.json`);
    await fs.writeJson(configPath, config, { spaces: 2 });
    return configPath;
  }

  /**
   * Generate temporary config file for picture-upload
   */
  async generatePictureUploadConfig(imageFile) {
    const config = {
      picturePath: imageFile.path,
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
        file_path: subtitleFile ? subtitleFile.fullPath : path.join(process.cwd(), sub.fileName)
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

    const configPath = path.join(this.tempConfigDir, `subtitle-upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.json`);
    await fs.writeJson(configPath, config, { spaces: 2 });
    return configPath;
  }

  /**
   * Guess image dimensions from filename
   */
  guessDimensionsFromFilename(filename) {
    const name = filename.toLowerCase();
    if (name.includes('1920x1080') || name.includes('1920_1080')) return '1920x1080';
    if (name.includes('1920x720') || name.includes('1920_720')) return '1920x720';
    if (name.includes('1080x1080') || name.includes('1080_1080')) return '1080x1080';
    if (name.includes('810x1920') || name.includes('810_1920')) return '810x1920';
    if (name.includes('1080x1920') || name.includes('1080_1920')) return '1080x1920';
    return null;
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