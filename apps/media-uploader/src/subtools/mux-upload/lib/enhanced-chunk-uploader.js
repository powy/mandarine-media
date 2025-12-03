import fs from 'fs/promises';
import http from 'http';
import https from 'https';
import axios from 'axios';
import { createUpload } from '@mux/upchunk';
import { handleChunkUploadError, handleResumeStateError, handleUploadMethodError, ErrorCodes } from '../utils/errorHandler.js';

/**
 * Enhanced Chunk Uploader with improved memory management and error recovery
 * Based on proven implementation from mux-test
 */
export class EnhancedChunkUploader {
  constructor(config, logger, retryHandler) {
    this.config = config;
    this.logger = logger;
    this.retryHandler = retryHandler;

    // Enhanced configuration with backward compatibility
    this.chunkSize = this.getChunkSize();
    this.memoryThreshold = this.getMemoryThreshold();
    this.uploadMethod = this.getUploadMethod();
    this.enableResume = this.config.options?.enable_resume !== false;

    // HTTP connection pooling and keep-alive configuration
    this.httpAgent = new http.Agent({
      keepAlive: this.config.options?.enable_keep_alive !== false,
      keepAliveMsecs: 30000, // Keep connections alive for 30 seconds
      maxSockets: this.config.options?.connection_pool_size || 5,
      maxFreeSockets: 2,
      timeout: 60000 // Socket timeout
    });

    this.httpsAgent = new https.Agent({
      keepAlive: this.config.options?.enable_keep_alive !== false,
      keepAliveMsecs: 30000,
      maxSockets: this.config.options?.connection_pool_size || 5,
      maxFreeSockets: 2,
      timeout: 60000
    });

    this.logger.info('HTTP connection pooling configured', {
      keepAlive: this.config.options?.enable_keep_alive !== false,
      maxSockets: this.config.options?.connection_pool_size || 5
    });
  }

  getChunkSize() {
    // Priority: config.options.chunk_size_mb > config.options.chunkSize (legacy) > default
    if (this.config.options?.chunk_size_mb) {
      return this.config.options.chunk_size_mb * 1024 * 1024;
    }
    if (this.config.options?.chunkSize) {
      return this.config.options.chunkSize; // Legacy support
    }
    return 5 * 1024 * 1024; // Default 5MB
  }

  getMemoryThreshold() {
    return (this.config.options?.memory_threshold_mb || 100) * 1024 * 1024; // Default 100MB
  }

  getUploadMethod() {
    return this.config.options?.upload_method || 'auto';
  }

  /**
   * Main upload method with smart method selection
   */
  async upload(uploadUrl, filepath) {
    let method;
    try {
      this.logger.info('EnhancedChunkUploader.upload() called', {
        uploadUrl: uploadUrl?.substring(0, 60) + '...',
        filePath: filepath
      });

      // Get file stats for decision making
      const stats = await fs.stat(filepath);

      this.logger.info('File stats retrieved for upload', {
        filePath: filepath,
        fileExists: true,
        fileSize: this.logger.formatBytes(stats.size),
        fileSizeBytes: stats.size
      });

      this.logger.logUploadStart(filepath, stats.size);

      // Smart method selection
      method = this.uploadMethod;
      if (method === 'auto') {
        // FIXED: Always use custom chunked uploader
        // UpChunk library (v3.5.0) is broken in Node.js 24 - hangs on first chunk
        // Custom method works perfectly for all file sizes
        method = 'custom';
      }

      this.logger.info('Upload method selected', {
        method,
        fileSize: this.logger.formatBytes(stats.size),
        threshold: this.logger.formatBytes(this.memoryThreshold),
        chunkSize: this.logger.formatBytes(this.chunkSize)
      });

      // Execute upload based on selected method
      if (method === 'custom') {
        return await this.uploadCustomChunked(uploadUrl, filepath, stats);
      } else if (method === 'upchunk') {
        return await this.uploadWithUpchunk(uploadUrl, filepath, stats);
      } else {
        throw new Error(`Unknown upload method: ${method}`);
      }

    } catch (error) {
      this.logger.error('Upload failed', error);

      // Use method-specific error handling if it's a method selection issue
      if (error.message.includes('Unknown upload method') && method) {
        handleUploadMethodError(method, error, 'Upload method selection');
      }

      throw error;
    }
  }

  /**
   * UpChunk library upload with enhanced file handling
   */
  async uploadWithUpchunk(uploadUrl, filepath, stats) {
    try {
      this.logger.info('Starting UpChunk upload', {
        file: filepath,
        size: this.logger.formatBytes(stats.size),
        chunkSizeMB: Math.round(this.chunkSize / (1024 * 1024))
      });

      // Create File/Blob object with fallback handling
      let file;
      try {
        // Try Node.js 20+ method if available
        if (typeof fs.openAsBlob === 'function') {
          file = await fs.openAsBlob(filepath);
        } else {
          throw new Error('openAsBlob not available');
        }
      } catch (error) {
        // Fallback: read file into buffer and create File object
        this.logger.info('Using buffer fallback for File object creation');
        const buffer = await fs.readFile(filepath);
        const filename = filepath.split(/[/\\]/).pop();
        file = new File([buffer], filename, { type: 'video/mp4' });
      }

      this.logger.info('File object created', {
        size: file.size,
        type: file.type,
        name: file.name
      });

      return new Promise((resolve, reject) => {
        const upload = createUpload({
          endpoint: uploadUrl,
          file: file,
          chunkSize: Math.floor(this.chunkSize / 1024), // UpChunk expects KB
          attempts: this.config.options?.max_chunk_retries || 5,
          delayBeforeAttempt: this.config.options?.retry_delay_base || 1000,
          dynamicChunkSize: this.config.options?.dynamic_chunk_size || false
        });

        let lastProgressTime = Date.now();
        let lastProgressPercent = 0;

        upload.on('attempt', (details) => {
          this.logger.info('Chunk upload attempt', {
            chunkNumber: details.chunkNumber,
            chunkSize: details.chunkSize ? `${details.chunkSize}KB` : 'unknown'
          });
        });

        upload.on('chunkSuccess', (details) => {
          this.logger.debug('Chunk uploaded successfully', {
            chunkNumber: details.chunkNumber,
            responseStatus: details.response?.status,
            chunkSize: details.chunkSize ? `${details.chunkSize}KB` : 'unknown'
          });
        });

        upload.on('progress', (progress) => {
          const percentage = parseFloat(progress.detail);
          const uploadedBytes = Math.round((percentage / 100) * stats.size);
          const now = Date.now();

          // Log progress every 5% or every 30 seconds
          if (percentage - lastProgressPercent >= 5 || now - lastProgressTime >= 30000) {
            this.logger.logProgress(uploadedBytes, stats.size, null);
            lastProgressTime = now;
            lastProgressPercent = percentage;
          }
        });

        upload.on('success', (response) => {
          const duration = Date.now() - this.logger.startTime;
          this.logger.logUploadComplete(duration);
          this.logger.info('UpChunk upload completed', {
            responseStatus: response?.status,
            responseHeaders: response?.headers ? Object.keys(response.headers) : []
          });
          resolve(response);
        });

        upload.on('error', (error) => {
          this.logger.error('UpChunk upload failed', error);
          reject(new Error(`Upload failed: ${error.message}`));
        });

        // Set timeout
        const timeoutMs = this.config.options?.timeout || 43200000;
        const timeout = setTimeout(() => {
          this.logger.error('Upload timeout', { timeoutMs });
          upload.abort();
          reject(new Error(`Upload timeout after ${timeoutMs}ms`));
        }, timeoutMs);

        upload.on('success', () => clearTimeout(timeout));
        upload.on('error', () => clearTimeout(timeout));
      });

    } catch (error) {
      this.logger.error('Failed to initialize UpChunk upload', error);
      throw error;
    }
  }

  /**
   * Custom chunked upload with memory optimization and resume capability
   */
  async uploadCustomChunked(uploadUrl, filepath, stats) {
    try {
      this.logger.info('Starting custom chunked upload', {
        file: filepath,
        size: this.logger.formatBytes(stats.size),
        chunkSize: this.logger.formatBytes(this.chunkSize),
        enableResume: this.enableResume
      });

      const fileSize = stats.size;
      const fileHandle = await fs.open(filepath, 'r');
      let uploadedBytes = 0;
      let chunkNumber = 0;

      // Resume state handling (if enabled)
      let resumeState = null;
      if (this.enableResume) {
        resumeState = await this.loadResumeState(filepath, fileSize);
        if (resumeState) {
          uploadedBytes = resumeState.uploadedBytes;
          chunkNumber = resumeState.chunkNumber;
          this.logger.info('Resuming upload from previous state', {
            uploadedBytes: this.logger.formatBytes(uploadedBytes),
            chunkNumber
          });
        }
      }

      try {
        while (uploadedBytes < fileSize) {
          chunkNumber++;
          const start = uploadedBytes;
          const end = Math.min(start + this.chunkSize - 1, fileSize - 1);
          const length = end - start + 1;

          const totalChunks = Math.ceil(fileSize / this.chunkSize);

          // Enhanced logging: Starting chunk upload with context
          this.logger.info(`Starting chunk ${chunkNumber}/${totalChunks} upload`, {
            chunkSize: this.logger.formatBytes(length),
            range: `bytes ${start}-${end}/${fileSize}`,
            progress: `${((uploadedBytes)/fileSize*100).toFixed(1)}%`
          });

          this.logger.debug('Chunk details', {
            chunkNumber,
            offset: start,
            totalChunks,
            chunkSize: this.logger.formatBytes(length)
          });

          // Read chunk efficiently
          const buffer = Buffer.alloc(length);
          const { bytesRead } = await fileHandle.read(buffer, 0, length, start);

          if (bytesRead !== length) {
            throw new Error(`Failed to read complete chunk: expected ${length}, got ${bytesRead}`);
          }

          // Add hang detection timeout for this chunk
          const chunkTimeout = setTimeout(() => {
            this.logger.error('CHUNK UPLOAD HUNG - No response for 60 seconds', {
              chunkNumber,
              uploadUrl: uploadUrl?.substring(0, 60) + '...',
              start,
              end
            });
          }, 60000); // 60 second timeout per chunk

          try {
            // Upload chunk with enhanced retry logic
            const chunkStartTime = Date.now();
            const response = await this.retryHandler.executeWithRetry(
              () => this.uploadChunk(uploadUrl, buffer, start, end, fileSize),
              {
                maxAttempts: this.config.options?.max_chunk_retries || 5,
                baseDelayMs: this.config.options?.retry_delay_base || 1000,
                context: `chunk ${chunkNumber}`
              }
            );
            const chunkDuration = Date.now() - chunkStartTime;

            // Clear timeout after successful upload
            clearTimeout(chunkTimeout);

            this.logger.info(`✓ Chunk ${chunkNumber}/${totalChunks} uploaded successfully`, {
              duration: `${(chunkDuration / 1000).toFixed(2)}s`,
              uploadedBytes: this.logger.formatBytes(uploadedBytes + length),
              progress: `${((uploadedBytes + length)/fileSize*100).toFixed(1)}%`
            });

            this.logger.debug('Chunk upload complete', {
              chunkNumber,
              status: response.status
            });

            // Handle response and update progress
            if (response.status === 308) {
              // Parse Range header to get actual uploaded bytes
              const range = response.headers.range || response.headers.Range;
              if (range) {
                const match = range.match(/bytes=0-(\d+)/);
                uploadedBytes = match ? parseInt(match[1]) + 1 : end + 1;
              } else {
                uploadedBytes = end + 1;
              }

              this.logger.logProgress(uploadedBytes, fileSize, chunkNumber);

              // Save resume state (if enabled)
              if (this.enableResume) {
                await this.saveResumeState(filepath, fileSize, uploadedBytes, chunkNumber);
              }

            } else if (response.status === 200 || response.status === 201) {
              this.logger.info('Upload complete!', {
                finalStatus: response.status,
                totalChunks: chunkNumber
              });
              const duration = Date.now() - this.logger.startTime;
              this.logger.logUploadComplete(duration);

              // Clean up resume state on success
              if (this.enableResume) {
                await this.cleanupResumeState(filepath, fileSize);
              }
              break;

            } else {
              throw new Error(`Unexpected response status: ${response.status}`);
            }
          } catch (chunkError) {
            // Clear timeout on error
            clearTimeout(chunkTimeout);

            // Enhanced error logging with chunk context
            this.logger.error(`✗ Chunk ${chunkNumber}/${totalChunks} upload failed`, {
              chunkNumber,
              error: chunkError.message,
              errorCode: chunkError.errorCode || chunkError.code,
              attempts: chunkError.attempts || 'unknown',
              range: `bytes ${start}-${end}/${fileSize}`
            });

            throw chunkError;
          }
        }

        return { success: true, chunks: chunkNumber };

      } finally {
        await fileHandle.close();
      }

    } catch (error) {
      this.logger.error('Custom chunked upload failed', error);
      throw error;
    }
  }

  /**
   * Upload a single chunk with proper headers
   */
  async uploadChunk(uploadUrl, chunk, start, end, total) {
    const chunkNumber = Math.floor(start / this.chunkSize) + 1;
    const chunkInfo = {
      chunkNumber,
      start,
      end,
      size: chunk.length
    };

    try {
      const headers = {
        'Content-Length': chunk.length.toString(),
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Content-Type': 'application/octet-stream'
      };

      this.logger.debug('Uploading chunk to Mux...', {
        chunkNumber,
        size: this.logger.formatBytes(chunk.length),
        range: headers['Content-Range']
      });

      const response = await axios.put(uploadUrl, chunk, {
        headers,
        timeout: this.config.options?.chunk_timeout || 120000, // 2 minutes per chunk
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: (status) => status === 200 || status === 201 || status === 308,
        // Use connection pooling and keep-alive
        httpAgent: this.httpAgent,
        httpsAgent: this.httpsAgent,
        // DNS lookup timeout
        lookup: {
          family: 4, // IPv4
          hints: 0
        }
      });

      this.logger.debug('Chunk upload response received', {
        chunkNumber,
        status: response.status,
        headers: {
          range: response.headers.range || response.headers.Range,
          contentLength: response.headers['content-length']
        }
      });

      return response;

    } catch (error) {
      // Enhanced error logging before throwing
      this.logger.debug(`Chunk ${chunkNumber} upload error caught`, {
        error: error.message,
        code: error.code,
        errno: error.errno
      });

      // Use enhanced chunk-specific error handling
      handleChunkUploadError(error, chunkInfo, `chunk ${chunkNumber} upload`);
    }
  }

  /**
   * Resume state management
   */
  async loadResumeState(filepath, fileSize) {
    if (!this.enableResume) return null;

    try {
      const stateFile = this.getResumeStateFile(filepath, fileSize);
      const stateExists = await fs.access(stateFile).then(() => true).catch(() => false);

      if (!stateExists) return null;

      const stateData = await fs.readFile(stateFile, 'utf8');
      const state = JSON.parse(stateData);

      // Validate state integrity
      if (state.filepath === filepath && state.fileSize === fileSize) {
        return state;
      } else {
        // Clean up invalid state
        await fs.unlink(stateFile).catch(() => {});
        return null;
      }
    } catch (error) {
      this.logger.warn('Failed to load resume state', { error: error.message });
      // Don't throw for non-critical resume state errors
      return null;
    }
  }

  async saveResumeState(filepath, fileSize, uploadedBytes, chunkNumber) {
    if (!this.enableResume) return;

    try {
      const stateFile = this.getResumeStateFile(filepath, fileSize);
      const state = {
        filepath,
        fileSize,
        uploadedBytes,
        chunkNumber,
        timestamp: Date.now(),
        chunkSize: this.chunkSize
      };

      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      this.logger.warn('Failed to save resume state', { error: error.message });
      // Don't throw for non-critical resume state errors, just log
    }
  }

  async cleanupResumeState(filepath, fileSize) {
    if (!this.enableResume) return;

    try {
      const stateFile = this.getResumeStateFile(filepath, fileSize);
      await fs.unlink(stateFile).catch(() => {}); // Ignore if file doesn't exist
    } catch (error) {
      this.logger.warn('Failed to cleanup resume state', { error: error.message });
    }
  }

  getResumeStateFile(filepath, fileSize) {
    // Use cached state file path if already generated for this upload session
    if (this._resumeStateFile) {
      return this._resumeStateFile;
    }

    const hash = require('crypto')
      .createHash('md5')
      .update(filepath + fileSize)
      .digest('hex');

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);

    // Cache the state file path for this upload session
    this._resumeStateFile = `/tmp/mux-upload-${timestamp}-${hash}-${randomId}.json`;
    return this._resumeStateFile;
  }
}

export default EnhancedChunkUploader;