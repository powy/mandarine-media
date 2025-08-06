import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mediaApi } from '../api/media';
import { apiClient } from '../api/client';
import type {
  MediaDescription,
  VideoFile,
  MediaDescriptionListResponse,
  VideoFileListResponse,
  MediaFilters,
  VideoFileFilters,
  BulkMediaDescriptionRequest,
  BulkMediaDescriptionResponse,
  DescriptionReport,
  DescriptionReportListResponse,
} from '../types';

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiClient = apiClient as any;

describe('Media API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMediaDescription: MediaDescription = {
    id: 'media-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
    file_number: 1246,
    episode_title: 'Running Man - EP 730',
    media_type: 'video',
    file_name: 'SBS_runningman_730',
    program_id: 'program-1',
    season_id: 'season-1',
    episode_number: 730,
  };

  const mockVideoFile: VideoFile = {
    id: 'video-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
    media_description_id: 'media-1',
    encodage_date_utc: '2024-01-15T12:00:00Z',
    duration_seconds: 3600,
    file_url: 'https://s3.aws.com/bucket/video.mp4',
    file_name: 'running_man_ep730.mp4',
    encoding_status: 'completed',
    upload_method: 'new_upload',
    upload_status: 'upload_completed',
  };

  const mockDescriptionReport: DescriptionReport = {
    id: 'report-1',
    description_id: 'media-1',
    title: 'Running Man - EP 730',
    success_associated_file: true,
    timestamp: '2024-01-15T10:30:00Z',
    batch_id: 'batch-1',
  };

  describe('Media Description Operations', () => {
    describe('getMediaDescriptions', () => {
      it('should fetch media descriptions without filters', async () => {
        const mockResponse: MediaDescriptionListResponse = {
          data: [mockMediaDescription],
          pagination: { skip: 0, limit: 20, total: 1, has_next: false, has_prev: false },
        };

        mockApiClient.get.mockResolvedValue({ data: mockResponse });

        const result = await mediaApi.getMediaDescriptions();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/media-descriptions?');
        expect(result).toEqual(mockResponse);
      });

      it('should fetch media descriptions with filters', async () => {
        const mockResponse: MediaDescriptionListResponse = {
          data: [mockMediaDescription],
          pagination: { skip: 0, limit: 10, total: 1, has_next: false, has_prev: false },
        };

        mockApiClient.get.mockResolvedValue({ data: mockResponse });

        const filters: MediaFilters = {
          skip: 0,
          limit: 10,
          media_type: 'video',
          category_id: 'cat-1',
          status: 'published',
          is_featured: true,
          is_premium: false,
        };

        const result = await mediaApi.getMediaDescriptions(filters);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/media-descriptions?skip=0&limit=10&media_type=video&category_id=cat-1&status=published&is_featured=true&is_premium=false'
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getMediaDescription', () => {
      it('should fetch single media description', async () => {
        mockApiClient.get.mockResolvedValue({ data: mockMediaDescription });

        const result = await mediaApi.getMediaDescription('media-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/media-descriptions/media-1');
        expect(result).toEqual(mockMediaDescription);
      });

      it('should handle media not found', async () => {
        const errorResponse = {
          response: {
            status: 404,
            data: { error: { code: 'NOT_FOUND', message: 'Media description not found' } },
          },
        };

        mockApiClient.get.mockRejectedValue(errorResponse);

        await expect(mediaApi.getMediaDescription('nonexistent')).rejects.toEqual(errorResponse);
      });
    });

    describe('createMediaDescription', () => {
      it('should create new media description', async () => {
        mockApiClient.post.mockResolvedValue({ data: mockMediaDescription });

        const createData = {
          episode_title: 'Running Man - EP 730',
          media_type: 'video' as const,
          file_number: 1246,
        };

        const result = await mediaApi.createMediaDescription(createData);

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/media-descriptions', createData);
        expect(result).toEqual(mockMediaDescription);
      });

      it('should handle validation errors', async () => {
        const errorResponse = {
          response: {
            status: 400,
            data: {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid media type provided',
                details: {
                  field: 'media_type',
                  allowed_values: ['video', 'webtoon', 'trailer', 'teaser', 'excerpt'],
                },
              },
            },
          },
        };

        mockApiClient.post.mockRejectedValue(errorResponse);

        const invalidData = {
          episode_title: 'Test',
          media_type: 'invalid' as any,
        };

        await expect(mediaApi.createMediaDescription(invalidData)).rejects.toEqual(errorResponse);
      });
    });

    describe('updateMediaDescription', () => {
      it('should update media description', async () => {
        const updatedMedia = { ...mockMediaDescription, episode_title: 'Updated Title' };
        mockApiClient.put.mockResolvedValue({ data: updatedMedia });

        const updateData = { episode_title: 'Updated Title' };
        const result = await mediaApi.updateMediaDescription('media-1', updateData);

        expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/media-descriptions/media-1', updateData);
        expect(result).toEqual(updatedMedia);
      });
    });

    describe('deleteMediaDescription', () => {
      it('should delete media description', async () => {
        mockApiClient.delete.mockResolvedValue({ data: mockMediaDescription });

        const result = await mediaApi.deleteMediaDescription('media-1');

        expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/media-descriptions/media-1');
        expect(result).toEqual(mockMediaDescription);
      });
    });
  });

  describe('Featured and Trending Content', () => {
    describe('getFeaturedMedia', () => {
      it('should fetch featured media with default pagination', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockMediaDescription] });

        const result = await mediaApi.getFeaturedMedia();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/media-descriptions/featured/list?skip=0&limit=20');
        expect(result).toEqual([mockMediaDescription]);
      });

      it('should fetch featured media with custom pagination', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockMediaDescription] });

        const result = await mediaApi.getFeaturedMedia(10, 5);

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/media-descriptions/featured/list?skip=10&limit=5');
        expect(result).toEqual([mockMediaDescription]);
      });
    });

    describe('getTrendingMedia', () => {
      it('should fetch trending media', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockMediaDescription] });

        const result = await mediaApi.getTrendingMedia(5, 10);

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/media-descriptions/trending/list?skip=5&limit=10');
        expect(result).toEqual([mockMediaDescription]);
      });
    });
  });

  describe('User Interactions', () => {
    describe('likeMedia', () => {
      it('should like media successfully', async () => {
        mockApiClient.post.mockResolvedValue({ data: mockMediaDescription });

        const result = await mediaApi.likeMedia('media-1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/media-descriptions/media-1/like');
        expect(result).toEqual(mockMediaDescription);
      });
    });

    describe('shareMedia', () => {
      it('should share media successfully', async () => {
        mockApiClient.post.mockResolvedValue({ data: mockMediaDescription });

        const result = await mediaApi.shareMedia('media-1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/media-descriptions/media-1/share');
        expect(result).toEqual(mockMediaDescription);
      });
    });
  });

  describe('Video File Operations', () => {
    describe('getVideoFiles', () => {
      it('should fetch video files without filters', async () => {
        const mockResponse: VideoFileListResponse = {
          data: [mockVideoFile],
          pagination: { skip: 0, limit: 20, total: 1, has_next: false, has_prev: false },
        };

        mockApiClient.get.mockResolvedValue({ data: mockResponse });

        const result = await mediaApi.getVideoFiles();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/video-files?');
        expect(result).toEqual(mockResponse);
      });

      it('should fetch video files with filters', async () => {
        const mockResponse: VideoFileListResponse = {
          data: [mockVideoFile],
          pagination: { skip: 10, limit: 5, total: 1, has_next: false, has_prev: false },
        };

        mockApiClient.get.mockResolvedValue({ data: mockResponse });

        const filters: VideoFileFilters = {
          skip: 10,
          limit: 5,
        };

        const result = await mediaApi.getVideoFiles(filters);

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/video-files?skip=10&limit=5');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getVideoFile', () => {
      it('should fetch single video file', async () => {
        mockApiClient.get.mockResolvedValue({ data: mockVideoFile });

        const result = await mediaApi.getVideoFile('video-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/video-files/video-1');
        expect(result).toEqual(mockVideoFile);
      });
    });

    describe('createVideoFile', () => {
      it('should create new video file', async () => {
        mockApiClient.post.mockResolvedValue({ data: mockVideoFile });

        const createData = {
          file_name: 'test_video.mp4',
          media_description_id: 'media-1',
        };

        const result = await mediaApi.createVideoFile(createData);

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/video-files', createData);
        expect(result).toEqual(mockVideoFile);
      });
    });

    describe('updateVideoFile', () => {
      it('should update video file', async () => {
        const updatedVideoFile = { ...mockVideoFile, encoding_status: 'processing' as const };
        mockApiClient.put.mockResolvedValue({ data: updatedVideoFile });

        const updateData = { encoding_status: 'processing' as const };
        const result = await mediaApi.updateVideoFile('video-1', updateData);

        expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/video-files/video-1', updateData);
        expect(result).toEqual(updatedVideoFile);
      });
    });

    describe('deleteVideoFile', () => {
      it('should delete video file', async () => {
        mockApiClient.delete.mockResolvedValue({ data: mockVideoFile });

        const result = await mediaApi.deleteVideoFile('video-1');

        expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/video-files/video-1');
        expect(result).toEqual(mockVideoFile);
      });
    });
  });

  describe('Video File Management', () => {
    describe('getVideoFilesByMedia', () => {
      it('should fetch video files by media ID', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockVideoFile] });

        const result = await mediaApi.getVideoFilesByMedia('media-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/video-files/by-media/media-1');
        expect(result).toEqual([mockVideoFile]);
      });
    });

    describe('getUnlinkedVideoFiles', () => {
      it('should fetch unlinked video files', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockVideoFile] });

        const result = await mediaApi.getUnlinkedVideoFiles(10, 5);

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/video-files/unlinked/list?skip=10&limit=5');
        expect(result).toEqual([mockVideoFile]);
      });
    });

    describe('linkVideoToMedia', () => {
      it('should link video file to media', async () => {
        mockApiClient.post.mockResolvedValue({ data: mockVideoFile });

        const result = await mediaApi.linkVideoToMedia('video-1', 'media-1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/video-files/video-1/link/media-1');
        expect(result).toEqual(mockVideoFile);
      });
    });

    describe('updateEncodingStatus', () => {
      it('should update encoding status without logs', async () => {
        mockApiClient.put.mockResolvedValue({ data: mockVideoFile });

        const result = await mediaApi.updateEncodingStatus('video-1', 'completed');

        expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/video-files/video-1/encoding-status', {
          status: 'completed',
          logs: undefined,
        });
        expect(result).toEqual(mockVideoFile);
      });

      it('should update encoding status with logs', async () => {
        mockApiClient.put.mockResolvedValue({ data: mockVideoFile });

        const result = await mediaApi.updateEncodingStatus('video-1', 'failed', 'Encoding error occurred');

        expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/video-files/video-1/encoding-status', {
          status: 'failed',
          logs: 'Encoding error occurred',
        });
        expect(result).toEqual(mockVideoFile);
      });
    });
  });

  describe('File Upload Operations', () => {
    describe('uploadVideoFile', () => {
      it('should upload video file successfully', async () => {
        const mockResponse = {
          message: 'File uploaded successfully',
          filename: 'test_video.mp4',
        };

        mockApiClient.post.mockResolvedValue({ data: mockResponse });

        const file = new File(['test content'], 'test_video.mp4', { type: 'video/mp4' });
        const result = await mediaApi.uploadVideoFile(file);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/video-files/upload',
          expect.any(FormData),
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        // Verify FormData was created with the file
        const formDataCall = mockApiClient.post.mock.calls[0][1];
        expect(formDataCall).toBeInstanceOf(FormData);

        expect(result).toEqual(mockResponse);
      });

      it('should handle upload errors', async () => {
        const errorResponse = {
          response: {
            status: 413,
            data: { error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds limit' } },
          },
        };

        mockApiClient.post.mockRejectedValue(errorResponse);

        const file = new File(['large content'], 'large_video.mp4', { type: 'video/mp4' });

        await expect(mediaApi.uploadVideoFile(file)).rejects.toEqual(errorResponse);
      });
    });

    describe('createVideoFileMetadata', () => {
      it('should create video file metadata for new upload', async () => {
        const mockResponse = {
          id: 'video-1',
          upload_url: 'https://s3.aws.com/upload-url',
          upload_status: 'metadata_only',
          message: 'Metadata created successfully',
        };

        mockApiClient.post.mockResolvedValue({ data: mockResponse });

        const data = {
          file_name: 'test_video.mp4',
          upload_method: 'new_upload' as const,
          media_description_id: 'media-1',
        };

        const result = await mediaApi.createVideoFileMetadata(data);

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/video-files/create-metadata', data);
        expect(result).toEqual(mockResponse);
      });

      it('should create video file metadata for existing URL', async () => {
        const mockResponse = {
          id: 'video-1',
          upload_status: 'upload_completed',
          message: 'Video linked successfully',
        };

        mockApiClient.post.mockResolvedValue({ data: mockResponse });

        const data = {
          file_name: 'existing_video.mp4',
          upload_method: 'existing_url' as const,
          external_url: 'https://example.com/video.mp4',
        };

        const result = await mediaApi.createVideoFileMetadata(data);

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/video-files/create-metadata', data);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('createVideoFileWithExistingUrl', () => {
      it('should create video file with existing URL', async () => {
        mockApiClient.post.mockResolvedValue({ data: mockVideoFile });

        const data = {
          file_name: 'existing_video.mp4',
          external_url: 'https://example.com/video.mp4',
          media_description_id: 'media-1',
        };

        const result = await mediaApi.createVideoFileWithExistingUrl(data);

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/video-files/create-with-existing-url', data);
        expect(result).toEqual(mockVideoFile);
      });
    });

    describe('uploadFileToExistingMetadata', () => {
      it('should upload file to existing metadata', async () => {
        const mockResponse = {
          success: true,
          message: 'File uploaded successfully',
          video_file_id: 'video-1',
          file_url: 'https://s3.aws.com/bucket/video.mp4',
          backend: 's3',
          upload_status: 'upload_completed',
          encoding_status: 'pending',
        };

        mockApiClient.post.mockResolvedValue({ data: mockResponse });

        const file = new File(['test content'], 'test_video.mp4', { type: 'video/mp4' });
        const result = await mediaApi.uploadFileToExistingMetadata('video-1', file);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/video-files/video-1/upload-file',
          expect.any(FormData),
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        expect(result).toEqual(mockResponse);
      });
    });

    describe('testVideoFilePlayback', () => {
      it('should test video file playback successfully', async () => {
        const mockResponse = {
          success: true,
          playback_url: 'https://cdn.kyool.com/video/playback',
          mux_playback_id: 'mux_playback_123',
        };

        mockApiClient.post.mockResolvedValue({ data: mockResponse });

        const result = await mediaApi.testVideoFilePlayback('video-1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/video-files/video-1/test');
        expect(result).toEqual(mockResponse);
      });

      it('should handle playback test failure', async () => {
        const mockResponse = {
          success: false,
          error_message: 'Video file not ready for playback',
        };

        mockApiClient.post.mockResolvedValue({ data: mockResponse });

        const result = await mediaApi.testVideoFilePlayback('video-1');

        expect(result).toEqual(mockResponse);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('createBulkMediaDescriptions', () => {
      it('should create bulk media descriptions', async () => {
        const bulkRequest: BulkMediaDescriptionRequest = {
          descriptions: [
            {
              episode_title: 'Episode 1',
              media_type: 'video',
              file_number: 1,
            },
            {
              episode_title: 'Episode 2',
              media_type: 'video',
              file_number: 2,
            },
          ],
        };

        const mockResponse: BulkMediaDescriptionResponse = {
          success_count: 2,
          error_count: 0,
          created_descriptions: [mockMediaDescription],
          errors: [],
        };

        mockApiClient.post.mockResolvedValue({ data: mockResponse });

        const result = await mediaApi.createBulkMediaDescriptions(bulkRequest);

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/media-descriptions/bulk', bulkRequest);
        expect(result).toEqual(mockResponse);
      });

      it('should handle partial bulk creation failure', async () => {
        const bulkRequest: BulkMediaDescriptionRequest = {
          descriptions: [
            {
              episode_title: 'Valid Episode',
              media_type: 'video',
              file_number: 1,
            },
            {
              episode_title: '',
              media_type: 'invalid' as any,
              file_number: 2,
            },
          ],
        };

        const mockResponse: BulkMediaDescriptionResponse = {
          success_count: 1,
          error_count: 1,
          created_descriptions: [mockMediaDescription],
          errors: [
            {
              index: 1,
              error: 'Invalid media type',
              description: {
                episode_title: '',
                media_type: 'invalid' as any,
                file_number: 2,
              },
            },
          ],
        };

        mockApiClient.post.mockResolvedValue({ data: mockResponse });

        const result = await mediaApi.createBulkMediaDescriptions(bulkRequest);

        expect(result).toEqual(mockResponse);
        expect(result.success_count).toBe(1);
        expect(result.error_count).toBe(1);
      });
    });
  });

  describe('Description Reports', () => {
    describe('getDescriptionReports', () => {
      it('should fetch description reports', async () => {
        const mockResponse: DescriptionReportListResponse = {
          data: [mockDescriptionReport],
          pagination: { skip: 0, limit: 20, total: 1, has_next: false, has_prev: false },
        };

        mockApiClient.get.mockResolvedValue({ data: mockResponse });

        const result = await mediaApi.getDescriptionReports(10, 5);

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/description-reports?skip=10&limit=5');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getDescriptionReport', () => {
      it('should fetch single description report', async () => {
        mockApiClient.get.mockResolvedValue({ data: mockDescriptionReport });

        const result = await mediaApi.getDescriptionReport('report-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/description-reports/report-1');
        expect(result).toEqual(mockDescriptionReport);
      });
    });

    describe('getDescriptionReportsByBatch', () => {
      it('should fetch description reports by batch', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockDescriptionReport] });

        const result = await mediaApi.getDescriptionReportsByBatch('batch-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/description-reports/batch/batch-1');
        expect(result).toEqual([mockDescriptionReport]);
      });
    });

    describe('getDescriptionReportsByDescription', () => {
      it('should fetch description reports by description ID', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockDescriptionReport] });

        const result = await mediaApi.getDescriptionReportsByDescription('media-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/description-reports/description/media-1');
        expect(result).toEqual([mockDescriptionReport]);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      mockApiClient.get.mockRejectedValue(timeoutError);

      await expect(mediaApi.getMediaDescriptions()).rejects.toThrow('Network timeout');
    });

    it('should handle server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
        },
      };

      mockApiClient.get.mockRejectedValue(serverError);

      await expect(mediaApi.getMediaDescription('media-1')).rejects.toEqual(serverError);
    });

    it('should handle empty filter objects', async () => {
      const mockResponse: MediaDescriptionListResponse = {
        data: [],
        pagination: { skip: 0, limit: 20, total: 0, has_next: false, has_prev: false },
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await mediaApi.getMediaDescriptions({});

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/media-descriptions?');
      expect(result).toEqual(mockResponse);
    });

    it('should handle large file uploads', async () => {
      const largeFileContent = 'x'.repeat(100 * 1024 * 1024); // 100MB
      const largeFile = new File([largeFileContent], 'large_video.mp4', { type: 'video/mp4' });

      const mockResponse = {
        message: 'Large file uploaded successfully',
        filename: 'large_video.mp4',
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await mediaApi.uploadVideoFile(largeFile);

      expect(result).toEqual(mockResponse);
    });

    it('should handle special characters in URLs', async () => {
      const specialId = 'media-with-special-chars-é@#$';
      mockApiClient.get.mockResolvedValue({ data: mockMediaDescription });

      await mediaApi.getMediaDescription(specialId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/media-descriptions/${specialId}`);
    });
  });
});