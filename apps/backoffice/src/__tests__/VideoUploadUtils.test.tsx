import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoUploadManager, validateUploadOptions, formatFileSize, formatDuration } from 'share';

// Mock the mediaApi
vi.mock('share', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    mediaApi: {
      createVideoFileMetadata: vi.fn(),
      createVideoFileWithExistingUrl: vi.fn(),
      uploadFileToExistingMetadata: vi.fn(),
      getVideoFile: vi.fn(),
    },
  };
});

describe('Video Upload Utilities', () => {
  describe('validateUploadOptions', () => {
    it('should validate new upload options correctly', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const options = {
        fileName: 'test.mp4',
        uploadMethod: 'new_upload' as const,
        file: mockFile,
      };

      const errors = validateUploadOptions(options);
      expect(errors).toHaveLength(0);
    });

    it('should validate existing URL options correctly', () => {
      const options = {
        fileName: 'test.mp4',
        uploadMethod: 'existing_url' as const,
        externalUrl: 'https://example.com/video.mp4',
      };

      const errors = validateUploadOptions(options);
      expect(errors).toHaveLength(0);
    });

    it('should return error for empty file name', () => {
      const options = {
        fileName: '',
        uploadMethod: 'new_upload' as const,
      };

      const errors = validateUploadOptions(options);
      expect(errors).toContain('File name is required');
    });

    it('should return error for new upload without file', () => {
      const options = {
        fileName: 'test.mp4',
        uploadMethod: 'new_upload' as const,
      };

      const errors = validateUploadOptions(options);
      expect(errors).toContain('File is required for new upload method');
    });

    it('should return error for existing URL without URL', () => {
      const options = {
        fileName: 'test.mp4',
        uploadMethod: 'existing_url' as const,
      };

      const errors = validateUploadOptions(options);
      expect(errors).toContain('External URL is required for existing URL upload method');
    });

    it('should return error for invalid URL format', () => {
      const options = {
        fileName: 'test.mp4',
        uploadMethod: 'existing_url' as const,
        externalUrl: 'not-a-valid-url',
      };

      const errors = validateUploadOptions(options);
      expect(errors).toContain('External URL must be a valid URL');
    });

    it('should return error for invalid file type', () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const options = {
        fileName: 'test.txt',
        uploadMethod: 'new_upload' as const,
        file: mockFile,
      };

      const errors = validateUploadOptions(options);
      expect(errors).toContain('File must be a valid video file');
    });

    it('should accept valid video file types', () => {
      const videoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm', 'video/quicktime'];
      
      videoTypes.forEach(type => {
        const mockFile = new File(['content'], `test.${type.split('/')[1]}`, { type });
        const options = {
          fileName: `test.${type.split('/')[1]}`,
          uploadMethod: 'new_upload' as const,
          file: mockFile,
        };

        const errors = validateUploadOptions(options);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1099511627776)).toBe('1 TB');
    });

    it('should handle decimal places correctly', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2621440)).toBe('2.5 MB');
      expect(formatFileSize(5368709120)).toBe('5 GB');
    });

    it('should handle large numbers', () => {
      expect(formatFileSize(52428800)).toBe('50 MB'); // 50MB
      expect(formatFileSize(2147483648)).toBe('2 GB'); // 2GB
    });
  });

  describe('formatDuration', () => {
    it('should format duration in minutes and seconds', () => {
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(5)).toBe('0:05');
    });

    it('should format duration with hours', () => {
      expect(formatDuration(3661)).toBe('1:01:01');
      expect(formatDuration(7200)).toBe('2:00:00');
      expect(formatDuration(3600)).toBe('1:00:00');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('should pad numbers correctly', () => {
      expect(formatDuration(125)).toBe('2:05'); // 2 minutes, 5 seconds
      expect(formatDuration(3665)).toBe('1:01:05'); // 1 hour, 1 minute, 5 seconds
    });
  });

  describe('VideoUploadManager', () => {
    let progressCallbacks: any[] = [];
    let uploadManager: VideoUploadManager;

    beforeEach(() => {
      vi.clearAllMocks();
      progressCallbacks = [];
      
      const onProgress = (progress: any) => {
        progressCallbacks.push(progress);
      };
      
      uploadManager = new VideoUploadManager(onProgress);
    });

    describe('uploadWithExistingUrl', () => {
      it('should call API with correct parameters', async () => {
        const { mediaApi } = require('share');
        const mockVideoFile = {
          id: 'test-id',
          file_name: 'test.mp4',
          external_url: 'https://example.com/video.mp4',
          upload_method: 'existing_url',
          upload_status: 'upload_completed',
        };

        mediaApi.createVideoFileWithExistingUrl.mockResolvedValue(mockVideoFile);

        const result = await uploadManager.uploadWithExistingUrl({
          fileName: 'test.mp4',
          externalUrl: 'https://example.com/video.mp4',
          mediaDescriptionId: 'media-123',
        });

        expect(mediaApi.createVideoFileWithExistingUrl).toHaveBeenCalledWith({
          file_name: 'test.mp4',
          external_url: 'https://example.com/video.mp4',
          media_description_id: 'media-123',
        });

        expect(result).toEqual(mockVideoFile);
      });

      it('should call progress callbacks', async () => {
        const { mediaApi } = require('share');
        const mockVideoFile = {
          id: 'test-id',
          file_name: 'test.mp4',
          external_url: 'https://example.com/video.mp4',
        };

        mediaApi.createVideoFileWithExistingUrl.mockResolvedValue(mockVideoFile);

        await uploadManager.uploadWithExistingUrl({
          fileName: 'test.mp4',
          externalUrl: 'https://example.com/video.mp4',
        });

        expect(progressCallbacks).toHaveLength(2);
        expect(progressCallbacks[0]).toMatchObject({
          stage: 'metadata',
          progress: 50,
          message: 'Creating video file with existing URL...',
        });
        expect(progressCallbacks[1]).toMatchObject({
          stage: 'completed',
          progress: 100,
          message: 'Video file created successfully with existing URL',
          videoFileId: 'test-id',
        });
      });

      it('should handle errors correctly', async () => {
        const { mediaApi } = require('share');
        const error = new Error('API Error');
        mediaApi.createVideoFileWithExistingUrl.mockRejectedValue(error);

        await expect(uploadManager.uploadWithExistingUrl({
          fileName: 'test.mp4',
          externalUrl: 'https://example.com/video.mp4',
        })).rejects.toThrow('API Error');

        expect(progressCallbacks).toHaveLength(2);
        expect(progressCallbacks[1]).toMatchObject({
          stage: 'error',
          progress: 0,
          message: 'Failed to create video file with existing URL',
          error: 'API Error',
        });
      });
    });

    describe('uploadNewFile', () => {
      it('should handle two-step upload process', async () => {
        const { mediaApi } = require('share');
        const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
        
        const metadataResponse = {
          id: 'test-id',
          upload_url: '/api/v1/video/files/test-id/upload-file',
          upload_status: 'metadata_only',
          message: 'Metadata created',
        };

        const uploadResponse = {
          success: true,
          message: 'File uploaded',
          video_file_id: 'test-id',
          file_url: 'https://example.com/uploaded.mp4',
          upload_status: 'upload_completed',
          encoding_status: 'pending',
        };

        const finalVideoFile = {
          id: 'test-id',
          file_name: 'test.mp4',
          file_url: 'https://example.com/uploaded.mp4',
          upload_status: 'upload_completed',
          encoding_status: 'pending',
        };

        mediaApi.createVideoFileMetadata.mockResolvedValue(metadataResponse);
        mediaApi.uploadFileToExistingMetadata.mockResolvedValue(uploadResponse);
        mediaApi.getVideoFile.mockResolvedValue(finalVideoFile);

        const result = await uploadManager.uploadNewFile({
          fileName: 'test.mp4',
          file: mockFile,
          mediaDescriptionId: 'media-123',
        });

        expect(mediaApi.createVideoFileMetadata).toHaveBeenCalledWith({
          file_name: 'test.mp4',
          upload_method: 'new_upload',
          media_description_id: 'media-123',
        });

        expect(mediaApi.uploadFileToExistingMetadata).toHaveBeenCalledWith('test-id', mockFile);
        expect(mediaApi.getVideoFile).toHaveBeenCalledWith('test-id');
        expect(result).toEqual(finalVideoFile);
      });

      it('should track progress through all stages', async () => {
        const { mediaApi } = require('share');
        const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
        
        mediaApi.createVideoFileMetadata.mockResolvedValue({
          id: 'test-id',
          upload_url: '/upload',
          upload_status: 'metadata_only',
        });
        
        mediaApi.uploadFileToExistingMetadata.mockResolvedValue({
          success: true,
          video_file_id: 'test-id',
        });
        
        mediaApi.getVideoFile.mockResolvedValue({
          id: 'test-id',
          file_name: 'test.mp4',
        });

        await uploadManager.uploadNewFile({
          fileName: 'test.mp4',
          file: mockFile,
        });

        expect(progressCallbacks).toHaveLength(5);
        expect(progressCallbacks[0].stage).toBe('metadata');
        expect(progressCallbacks[1].stage).toBe('metadata');
        expect(progressCallbacks[2].stage).toBe('uploading');
        expect(progressCallbacks[3].stage).toBe('uploading');
        expect(progressCallbacks[4].stage).toBe('completed');
      });
    });

    describe('upload (generic method)', () => {
      it('should route to existing URL method', async () => {
        const { mediaApi } = require('share');
        mediaApi.createVideoFileWithExistingUrl.mockResolvedValue({
          id: 'test-id',
          file_name: 'test.mp4',
        });

        const options = {
          fileName: 'test.mp4',
          uploadMethod: 'existing_url' as const,
          externalUrl: 'https://example.com/video.mp4',
        };

        await uploadManager.upload(options);

        expect(mediaApi.createVideoFileWithExistingUrl).toHaveBeenCalled();
      });

      it('should route to new upload method', async () => {
        const { mediaApi } = require('share');
        const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
        
        mediaApi.createVideoFileMetadata.mockResolvedValue({
          id: 'test-id',
          upload_url: '/upload',
        });
        mediaApi.uploadFileToExistingMetadata.mockResolvedValue({
          success: true,
          video_file_id: 'test-id',
        });
        mediaApi.getVideoFile.mockResolvedValue({
          id: 'test-id',
          file_name: 'test.mp4',
        });

        const options = {
          fileName: 'test.mp4',
          uploadMethod: 'new_upload' as const,
          file: mockFile,
        };

        await uploadManager.upload(options);

        expect(mediaApi.createVideoFileMetadata).toHaveBeenCalled();
      });

      it('should throw error for existing URL method without URL', async () => {
        const options = {
          fileName: 'test.mp4',
          uploadMethod: 'existing_url' as const,
        };

        await expect(uploadManager.upload(options)).rejects.toThrow(
          'External URL is required for existing URL upload method'
        );
      });

      it('should throw error for new upload method without file', async () => {
        const options = {
          fileName: 'test.mp4',
          uploadMethod: 'new_upload' as const,
        };

        await expect(uploadManager.upload(options)).rejects.toThrow(
          'File is required for new upload method'
        );
      });
    });
  });
});