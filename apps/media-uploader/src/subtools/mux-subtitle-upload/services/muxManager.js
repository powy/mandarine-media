import Mux from '@mux/mux-node';

export default class MuxManager {
  constructor(config, logger) {
    this.mux = new Mux({
      tokenId: config.mux_token_id,
      tokenSecret: config.mux_token_secret
    });
    this.logger = logger;
    this.maxRetryAttempts = config.max_retry_attempts || 3;
    this.retryDelay = config.retry_delay || 5000;
  }

  /**
   * Add subtitle track to Mux asset with retry logic
   */
  async addSubtitleTrack(assetId, presignedUrl, options = {}) {
    let lastError;
    let trackData = null;

    for (let attempt = 1; attempt <= this.maxRetryAttempts; attempt++) {
      try {
        this.logger.info(`Attempting to add subtitle track to Mux (attempt ${attempt}/${this.maxRetryAttempts})`, {
          assetId: assetId,
          language: options.language_code || 'en',
          attempt: attempt,
          url: presignedUrl
        });

        trackData = {
          url: presignedUrl,
          type: 'text',
          text_type: options.text_type || 'subtitles',
          language_code: options.language_code || 'en',
          name: options.name || this.generateUniqueTrackName(options.language_code || 'en'),
          closed_captions: options.closed_captions || false
        };

        // Add default flag if specified (for French subtitles)
        if (options.is_default === true) {
          trackData.default = true;
        }

        // Add passthrough if provided
        if (options.passthrough) {
          trackData.passthrough = options.passthrough;
        }

        // Defensive check for trackData
        if (!trackData) {
          throw new Error('trackData is not defined - this indicates a critical error in track preparation');
        }

        // Log the exact API call being made
        this.logger.info('Making Mux API call to create track', {
          endpoint: `https://api.mux.com/video/v1/assets/${assetId}/tracks`,
          method: 'POST',
          payload: JSON.stringify(trackData, null, 2),
          assetId: assetId,
          attempt: attempt
        });

        const track = await this.mux.video.assets.createTrack(assetId, trackData);

        this.logger.info('Mux API response received', {
          response: JSON.stringify(track, null, 2)
        });

        this.logger.info('Subtitle track added successfully to Mux', {
          assetId: assetId,
          trackId: track.id,
          language: trackData?.language_code || 'unknown',
          name: trackData?.name || 'unknown',
          default: trackData?.default || false,
          attempt: attempt
        });

        return {
          success: true,
          trackId: track.id,
          assetId: assetId,
          attempt: attempt,
          track: track
        };

      } catch (error) {
        lastError = error;
        
        this.logger.error(`Mux track creation failed (attempt ${attempt}/${this.maxRetryAttempts})`, {
          error: error.message,
          errorStack: error.stack,
          assetId: assetId,
          attempt: attempt,
          requestPayload: trackData ? JSON.stringify(trackData, null, 2) : 'trackData not available',
          responseStatus: error.response?.status,
          responseData: error.response?.data ? JSON.stringify(error.response.data, null, 2) : undefined
        });

        // If this was the last attempt, don't wait
        if (attempt === this.maxRetryAttempts) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        this.logger.info(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If we get here, all attempts failed
    throw lastError;
  }

  /**
   * Monitor subtitle track status
   */
  async monitorTrackStatus(assetId, trackId, maxWaitTime = 60000, checkInterval = 5000) {
    const startTime = Date.now();
    
    this.logger.info('Starting track status monitoring', {
      assetId: assetId,
      trackId: trackId,
      maxWaitTimeMs: maxWaitTime,
      checkIntervalMs: checkInterval
    });

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const asset = await this.mux.video.assets.retrieve(assetId);
        const track = asset.tracks?.find(t => t.id === trackId);

        if (track) {
          this.logger.debug('Track status check', {
            trackId: trackId,
            status: track.status,
            duration: track.duration,
            elapsedMs: Date.now() - startTime
          });

          if (track.status === 'ready') {
            const processingTime = Date.now() - startTime;
            this.logger.info('Track processing complete', {
              trackId: trackId,
              processingTimeMs: processingTime
            });
            return { 
              success: true, 
              track: track, 
              processingTimeMs: processingTime 
            };
          }

          if (track.status === 'errored') {
            this.logger.error('Track processing failed', {
              trackId: trackId,
              error: track.error || 'Unknown error'
            });
            return { 
              success: false, 
              error: track.error || 'Track processing failed',
              track: track
            };
          }
        } else {
          this.logger.warn('Track not found in asset', {
            trackId: trackId,
            assetId: assetId
          });
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval));

      } catch (error) {
        this.logger.error('Error checking track status', {
          error: error.message,
          trackId: trackId,
          assetId: assetId
        });
        
        // Wait before retrying status check
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    this.logger.warn('Track monitoring timeout', {
      trackId: trackId,
      timeoutMs: maxWaitTime
    });

    return { 
      success: false, 
      error: 'Monitoring timeout - track may still be processing',
      timeout: true
    };
  }

  /**
   * Get language display name from ISO 639-1 code
   */
  getLanguageName(code) {
    const languages = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português',
      'ja': '日本語',
      'ko': '한국어',
      'zh': '中文',
      'ru': 'Русский',
      'ar': 'العربية',
      'hi': 'हिन्दी',
      'nl': 'Nederlands',
      'sv': 'Svenska',
      'da': 'Dansk',
      'no': 'Norsk',
      'fi': 'Suomi',
      'pl': 'Polski',
      'tr': 'Türkçe',
      'el': 'Ελληνικά',
      'he': 'עברית',
      'th': 'ไทย',
      'vi': 'Tiếng Việt'
    };
    return languages[code] || code.toUpperCase();
  }

  /**
   * Generate unique track name to avoid conflicts
   */
  generateUniqueTrackName(languageCode) {
    const baseName = this.getLanguageName(languageCode);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 5);
    return `${baseName}_${timestamp}_${randomSuffix}`;
  }

  /**
   * Validate asset exists and is ready before adding subtitles
   */
  async validateAsset(assetId) {
    try {
      this.logger.info('Validating Mux asset', {
        assetId: assetId
      });
      
      const asset = await this.mux.video.assets.retrieve(assetId);
      
      this.logger.info('Asset validation successful', {
        assetId: assetId,
        status: asset.status,
        duration: asset.duration,
        createdAt: asset.created_at
      });

      return {
        exists: true,
        status: asset.status,
        ready: asset.status === 'ready',
        asset: asset
      };

    } catch (error) {
      this.logger.error('Asset validation failed', {
        assetId: assetId,
        error: error.message
      });

      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * List existing tracks on an asset
   */
  async listAssetTracks(assetId) {
    try {
      const asset = await this.mux.video.assets.retrieve(assetId);
      const tracks = asset.tracks || [];
      
      this.logger.info('Retrieved asset tracks', {
        assetId: assetId,
        trackCount: tracks.length,
        textTracks: tracks.filter(t => t.type === 'text').length
      });

      return {
        success: true,
        tracks: tracks,
        textTracks: tracks.filter(t => t.type === 'text')
      };
    } catch (error) {
      this.logger.error('Failed to list asset tracks', {
        assetId: assetId,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}