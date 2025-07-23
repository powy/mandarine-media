import { useState, useCallback } from 'react';
import { VideoUploadManager, VideoUploadOptions, UploadProgress, validateUploadOptions } from '../utils/videoUpload';
import { VideoFile } from '../types';

export interface UseVideoUploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  videoFile: VideoFile | null;
}

export interface UseVideoUploadReturn {
  state: UseVideoUploadState;
  upload: (options: VideoUploadOptions) => Promise<VideoFile | null>;
  reset: () => void;
  validateOptions: (options: VideoUploadOptions) => string[];
}

/**
 * React hook for managing video upload state and operations
 */
export function useVideoUpload(): UseVideoUploadReturn {
  const [state, setState] = useState<UseVideoUploadState>({
    isUploading: false,
    progress: null,
    error: null,
    videoFile: null,
  });

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: null,
      error: null,
      videoFile: null,
    });
  }, []);

  const upload = useCallback(async (options: VideoUploadOptions): Promise<VideoFile | null> => {
    // Validate options first
    const validationErrors = validateUploadOptions(options);
    if (validationErrors.length > 0) {
      setState(prev => ({
        ...prev,
        error: validationErrors.join(', '),
        isUploading: false,
      }));
      return null;
    }

    setState(prev => ({
      ...prev,
      isUploading: true,
      error: null,
      progress: null,
      videoFile: null,
    }));

    try {
      const uploadManager = new VideoUploadManager((progress) => {
        setState(prev => ({
          ...prev,
          progress,
          error: progress.stage === 'error' ? progress.error || 'Upload failed' : null,
        }));
      });

      const videoFile = await uploadManager.upload(options);

      setState(prev => ({
        ...prev,
        isUploading: false,
        videoFile,
      }));

      return videoFile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  return {
    state,
    upload,
    reset,
    validateOptions: validateUploadOptions,
  };
}