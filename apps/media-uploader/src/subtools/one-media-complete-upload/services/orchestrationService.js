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
  }

  async processUploads(excelData, mediaFiles, folderPath, excelPath = null) {
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
      
      // Step 2: Upload subtitles to Mux (after videos are ready)
      console.log(chalk.cyan('📝 Uploading subtitles to Mux...'));
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
      
      // Step 3: Upload images to S3
      console.log(chalk.cyan('🖼️  Uploading images to S3...'));
      const imageResults = await this.uploadImagesToS3(excelData.files, mediaFiles, folderPath);
      results.uploads.images = imageResults.successes;
      if (imageResults.errors.length > 0) {
        results.errors.push(...imageResults.errors);
      }
      
      // Step 4: Create media description via API (two-step process)
      console.log(chalk.cyan('📄 Creating media description...'));
      const apiResult = await this.createMediaDescription(
        excelData.description, 
        results.uploads.images,
        videoResults.successes // Pass all video assets instead of just main
      );
      
      if (apiResult.success) {
        results.mediaDescriptionId = apiResult.id;
        results.success = true;
        console.log(chalk.green(`✅ Media description created with ID: ${apiResult.id}`));
        
        // Update Excel file with media_description ID and rename file
        if (this.excelService && excelPath) {
          try {
            console.log(chalk.cyan('📄 Updating Excel file with media description ID...'));
            
            // Save media_description ID to Description sheet
            await this.excelService.saveMediaDescriptionToExcel(excelPath, apiResult.id);
            console.log(chalk.green(`✅ Saved media description ID to Excel`));
            
            // Rename Excel file with _uploaded suffix
            const newExcelPath = await this.excelService.renameExcelFile(excelPath);
            console.log(chalk.green(`✅ Renamed Excel file: ${path.basename(newExcelPath)}`));
            
            // Store the new Excel path in results for reference
            results.updatedExcelPath = newExcelPath;
            
          } catch (excelError) {
            // Don't fail the entire upload process if Excel update fails
            this.logger.error(`Excel update failed: ${excelError.message}`);
            results.errors.push(`Excel update failed: ${excelError.message}`);
            console.log(chalk.yellow(`⚠️  Excel update failed: ${excelError.message}`));
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
        
        console.log(chalk.gray(`  Uploading ${videoFile.name}...`));
        
        const result = await uploadToMux({
          config: configPath,
          verbose: false,
          quiet: true
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
        
        console.log(chalk.green(`    ✅ ${videoFile.name} uploaded (Asset: ${result.asset.id}, Type: ${entry.type})`));
        
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

  async uploadSubtitlesToMux(filesData, mediaFiles, folderPath, videoAssets) {
    const successes = [];
    const errors = [];
    
    // Collect subtitle files from Files sheet
    const subtitleFiles = [];
    filesData.forEach(file => {
      if (file.frSubtitle) subtitleFiles.push({ fileName: file.frSubtitle, language: 'fr', name: 'Français', isDefault: true });
      if (file.enSubtitle) subtitleFiles.push({ fileName: file.enSubtitle, language: 'en', name: 'English', isDefault: false });
      if (file.koSubtitle) subtitleFiles.push({ fileName: file.koSubtitle, language: 'ko', name: '한국어', isDefault: false });
    });
    
    if (subtitleFiles.length === 0) {
      console.log(chalk.gray('  No subtitles to upload'));
      return { successes, errors };
    }
    
    // Group subtitles by their corresponding video asset
    const subtitlesByAsset = new Map();
    
    subtitleFiles.forEach(subtitleFile => {
      // Find the corresponding video asset by matching filename patterns
      const matchingAsset = this.findMatchingVideoAssetForSubtitle(subtitleFile.fileName, videoAssets);
      
      if (matchingAsset) {
        if (!subtitlesByAsset.has(matchingAsset.assetId)) {
          subtitlesByAsset.set(matchingAsset.assetId, {
            asset: matchingAsset,
            subtitles: []
          });
        }
        subtitlesByAsset.get(matchingAsset.assetId).subtitles.push(subtitleFile);
        
        this.logger.info(`Matched subtitle "${subtitleFile.fileName}" to video asset: ${matchingAsset.assetId} (${matchingAsset.type})`);
      } else {
        const errorMsg = `No matching video asset found for subtitle: ${subtitleFile.fileName}`;
        errors.push(errorMsg);
        this.logger.error(errorMsg);
      }
    });
    
    // Process subtitles for each video asset
    for (const [assetId, assetData] of subtitlesByAsset.entries()) {
      try {
        this.logger.info(`Processing ${assetData.subtitles.length} subtitles for asset: ${assetId} (${assetData.asset.type})`);
        
        // Generate config for this specific asset's subtitles
        const configPath = await this.generateSubtitleUploadConfig(assetData.subtitles, mediaFiles, assetId);
        
        console.log(chalk.gray(`  Uploading ${assetData.subtitles.length} subtitle files for ${assetData.asset.type}...`));
        
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
                assetId: assetId,
                videoType: assetData.asset.type,
                result: res
              });
              console.log(chalk.green(`    ✅ ${res.subtitle.language_code} (${assetData.asset.type}): ${res.trackId}`));
            } else {
              errors.push(`Subtitle upload failed (${res.subtitle.language_code}, ${assetData.asset.type}): ${res.error}`);
              console.log(chalk.red(`    ❌ ${res.subtitle.language_code} (${assetData.asset.type}): ${res.error}`));
            }
          });
        }
        
      } catch (error) {
        const errorMsg = `Subtitle upload failed for asset ${assetId} (${assetData.asset.type}): ${error.message}`;
        errors.push(errorMsg);
        console.log(chalk.red(`    ❌ ${errorMsg}`));
        this.logger.error(errorMsg);
      }
    }
    
    return { successes, errors };
  }

  /**
   * Find the matching video asset for a subtitle file based on filename patterns
   */
  findMatchingVideoAssetForSubtitle(subtitleFileName, videoAssets) {
    // Extract the base name from subtitle filename (remove language suffix)
    // Examples: 
    // "pompom bag - fr.srt" -> "pompom bag"
    // "trailer 01 - pompom bag - fr.srt" -> "trailer 01 - pompom bag"  
    // "EX 01 - pompom bag - en.srt" -> "EX 01 - pompom bag"
    
    const baseNameMatch = subtitleFileName.match(/^(.+?)\s*-\s*(fr|en|ko)\.srt$/i);
    if (!baseNameMatch) {
      this.logger.warn(`Could not parse subtitle filename pattern: ${subtitleFileName}`);
      return null;
    }
    
    const baseName = baseNameMatch[1].trim();
    this.logger.debug(`Looking for video asset matching subtitle base name: "${baseName}"`);
    
    // Try to find matching video asset by comparing base names
    const matchingAsset = videoAssets.find(asset => {
      const videoBaseName = asset.fileName.replace(/\.(mp4|mov|avi)$/i, '');
      const matches = videoBaseName === baseName;
      
      if (matches) {
        this.logger.debug(`Found match: "${baseName}" -> "${videoBaseName}" (${asset.type})`);
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
      
      // STEP 1: Create media description without asset IDs (text-only fields)
      this.logger.info('Step 1: Creating media description with text-only fields...');
      const textOnlyData = this.mapExcelToApiSchemaTextOnly(descriptionData);
      
      const createUrl = `${this.config.backend.baseUrl}/api/v1/media-descriptions/from-text`;
      
      this.logger.info(`Creating media description via API: ${createUrl}`);
      this.logger.info(`Using JWT Bearer token authentication`);
      this.logger.info(`Text-only API payload keys: ${Object.keys(textOnlyData).join(', ')}`);
      
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
      
      const patchUrl = `${this.config.backend.baseUrl}/api/v1/media-descriptions/${mediaDescriptionId}`;
      
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

    return apiData;
  }

  /**
   * Map uploaded assets (images and videos) to API schema for PATCH request
   */
  mapAssetsToApiSchema(uploadedImages, videoAssets, mediaDescriptionId) {
    const assetData = {};

    // Associate uploaded images by dimensions
    this.logger.info(`Processing ${uploadedImages.length} uploaded images for asset mapping`);
    uploadedImages.forEach(image => {
      const dimensions = image.dimensions;
      if (dimensions && image.pictureId) {
        const fieldName = `image_${dimensions.replace('x', '_')}_id`;
        assetData[fieldName] = image.pictureId;
        this.logger.info(`Mapped image field: ${fieldName} = "${image.pictureId}"`);
      } else {
        this.logger.warn(`Image missing dimensions or picture ID - skipping: "${image.fileName}" (dimensions: ${dimensions}, pictureId: ${image.pictureId})`);
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
    if (name.includes('810x1080') || name.includes('810_1080')) return '810x1080';
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