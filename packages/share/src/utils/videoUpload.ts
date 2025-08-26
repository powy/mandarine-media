import { mediaApi } from '../api/media';
import { VideoFile } from '../types';

export type UploadMethod = 'new_upload' | 'existing_url';

export interface VideoUploadOptions {
  fileName: string;
  uploadMethod: UploadMethod;
  mediaDescriptionId?: string;
  externalUrl?: string;
  file?: File;
}

export interface UploadProgress {
  stage: 'metadata' | 'uploading' | 'completed' | 'error';
  progress: number;
  message: string;
  videoFileId?: string;
  error?: string;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

/**
 * Orchestrates the complete video upload workflow for both new uploads and existing URLs
 */
export class VideoUploadManager {
  private onProgress?: UploadProgressCallback;

  constructor(onProgress?: UploadProgressCallback) {
    this.onProgress = onProgress;
  }

  /**
   * Upload video using existing URL method
   */
  async uploadWithExistingUrl(options: {
    fileName: string;
    externalUrl: string;
    mediaDescriptionId?: string;
  }): Promise<VideoFile> {
    try {
      this.updateProgress({
        stage: 'metadata',
        progress: 50,
        message: 'Creating video file with existing URL...',
      });

      const videoFile = await mediaApi.createVideoFileWithExistingUrl({
        file_name: options.fileName,
        external_url: options.externalUrl,
        media_description_id: options.mediaDescriptionId,
      });

      this.updateProgress({
        stage: 'completed',
        progress: 100,
        message: 'Video file created successfully with existing URL',
        videoFileId: videoFile.id,
      });

      return videoFile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.updateProgress({
        stage: 'error',
        progress: 0,
        message: 'Failed to create video file with existing URL',
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Upload new file using two-step process
   */
  async uploadNewFile(options: {
    fileName: string;
    file: File;
    mediaDescriptionId?: string;
  }): Promise<VideoFile> {
    try {
      // Step 1: Create metadata
      this.updateProgress({
        stage: 'metadata',
        progress: 10,
        message: 'Creating video file metadata...',
      });

      const metadataResponse = await mediaApi.createVideoFileMetadata({
        file_name: options.fileName,
        media_description_id: options.mediaDescriptionId,
      });

      this.updateProgress({
        stage: 'metadata',
        progress: 25,
        message: 'Metadata created, preparing file upload...',
        videoFileId: metadataResponse.id,
      });

      // Step 2: Upload file
      this.updateProgress({
        stage: 'uploading',
        progress: 30,
        message: 'Uploading file...',
        videoFileId: metadataResponse.id,
      });

      await mediaApi.uploadFileToExistingMetadata(
        metadataResponse.id,
        options.file
      );

      this.updateProgress({
        stage: 'uploading',
        progress: 90,
        message: 'File uploaded, finalizing...',
        videoFileId: metadataResponse.id,
      });

      // Get the updated video file
      const videoFile = await mediaApi.getVideoFile(metadataResponse.id);

      this.updateProgress({
        stage: 'completed',
        progress: 100,
        message: 'Video file uploaded successfully',
        videoFileId: videoFile.id,
      });

      return videoFile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.updateProgress({
        stage: 'error',
        progress: 0,
        message: 'Failed to upload video file',
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Generic upload method that routes to appropriate handler based on upload method
   */
  async upload(options: VideoUploadOptions): Promise<VideoFile> {
    if (options.uploadMethod === 'existing_url') {
      if (!options.externalUrl) {
        throw new Error('External URL is required for existing URL upload method');
      }
      return this.uploadWithExistingUrl({
        fileName: options.fileName,
        externalUrl: options.externalUrl,
        mediaDescriptionId: options.mediaDescriptionId,
      });
    } else {
      if (!options.file) {
        throw new Error('File is required for new upload method');
      }
      return this.uploadNewFile({
        fileName: options.fileName,
        file: options.file,
        mediaDescriptionId: options.mediaDescriptionId,
      });
    }
  }

  private updateProgress(progress: UploadProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }
}

/**
 * Utility function to test video file playback
 */
export async function testVideoPlayback(videoFileId: string): Promise<{
  success: boolean;
  playbackUrl?: string;
  errorMessage?: string;
  muxPlaybackId?: string;
}> {
  try {
    const result = await mediaApi.testVideoFilePlayback(videoFileId);
    return {
      success: result.success,
      playbackUrl: result.playback_url,
      errorMessage: result.error_message,
      muxPlaybackId: result.mux_playback_id,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Utility function to validate upload options
 */
export function validateUploadOptions(options: VideoUploadOptions): string[] {
  const errors: string[] = [];

  if (!options.fileName.trim()) {
    errors.push('File name is required');
  }

  if (options.uploadMethod === 'existing_url') {
    if (!options.externalUrl?.trim()) {
      errors.push('External URL is required for existing URL upload method');
    } else if (!isValidUrl(options.externalUrl)) {
      errors.push('External URL must be a valid URL');
    }
  } else if (options.uploadMethod === 'new_upload') {
    if (!options.file) {
      errors.push('File is required for new upload method');
    } else if (!isValidVideoFile(options.file)) {
      errors.push('File must be a valid video file');
    }
  } else {
    errors.push('Upload method must be either "new_upload" or "existing_url"');
  }

  return errors;
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file is a valid video file
 */
function isValidVideoFile(file: File): boolean {
  const validTypes = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/mkv',
    'video/webm',
    'video/quicktime',
  ];
  return validTypes.includes(file.type);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}