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
    patch: vi.fn(),
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
    main_video_file_id: 'video-1',
    program_id: 'program-1',
    season_id: 'season-1',
    episode_number: 730,
    // NEW: Relationship objects (returned by backend)
    actors: [
      { id: 'person-1', full_name: 'Yoo Jae-suk', role_type: 'main_actor' },
      { id: 'person-2', full_name: 'Kim Jong-kook', role_type: 'main_actor' }
    ],
    directors: [
      { id: 'person-3', full_name: 'Jo Hyo-jin', role_type: 'main_director' }
    ],
    producers: [
      { id: 'person-4', full_name: 'SBS Production Team', role_type: 'executive_producer' }
    ],
    media_themes: [
      { id: 'theme-1', theme_name: 'variety' },
      { id: 'theme-2', theme_name: 'comedy' }
    ],
    additional_images: [
      { id: 'image-1', file_name: 'episode_poster.jpg' },
      { id: 'image-2', file_name: 'behind_scenes.jpg' }
    ],
    /** @deprecated Use actors relationship object instead */
    actors_id_list: ['person-1', 'person-2'],
    /** @deprecated Use directors relationship object instead */
    directors_id_list: ['person-3'],
    /** @deprecated Use producers relationship object instead */
    producers_id_list: ['person-4'],
    /** @deprecated Use additional_images relationship object instead */
    additional_images_id_list: ['image-1', 'image-2'],
  };

  const mockVideoFile: VideoFile = {
    id: 'video-1',
    creation_date_utc: '2024-01-15T10:30:00Z',
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

        expect(mockApiClient.get).toHaveBeenCalledWith('/media-descriptions?');
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
          '/media-descriptions?skip=0&limit=10&media_type=video&category_id=cat-1&status=published&is_featured=true&is_premium=false'
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getMediaDescription', () => {
      it('should fetch single media description', async () => {
        mockApiClient.get.mockResolvedValue({ data: mockMediaDescription });

        const result = await mediaApi.getMediaDescription('media-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/media-descriptions/media-1');
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

        expect(mockApiClient.post).toHaveBeenCalledWith('/media-descriptions', createData);
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

        expect(mockApiClient.put).toHaveBeenCalledWith('/media-descriptions/media-1', updateData);
        expect(result).toEqual(updatedMedia);
      });
    });

    describe('deleteMediaDescription', () => {
      it('should delete media description', async () => {
        mockApiClient.delete.mockResolvedValue({ data: mockMediaDescription });

        const result = await mediaApi.deleteMediaDescription('media-1');

        expect(mockApiClient.delete).toHaveBeenCalledWith('/media-descriptions/media-1');
        expect(result).toEqual(mockMediaDescription);
      });
    });
  });

  describe('Featured and Trending Content', () => {
    describe('getFeaturedMedia', () => {
      it('should fetch featured media with default pagination', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockMediaDescription] });

        const result = await mediaApi.getFeaturedMedia();

        expect(mockApiClient.get).toHaveBeenCalledWith('/media-descriptions/featured/list?skip=0&limit=20');
        expect(result).toEqual([mockMediaDescription]);
      });

      it('should fetch featured media with custom pagination', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockMediaDescription] });

        const result = await mediaApi.getFeaturedMedia(10, 5);

        expect(mockApiClient.get).toHaveBeenCalledWith('/media-descriptions/featured/list?skip=10&limit=5');
        expect(result).toEqual([mockMediaDescription]);
      });
    });

    describe('getTrendingMedia', () => {
      it('should fetch trending media', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockMediaDescription] });

        const result = await mediaApi.getTrendingMedia(5, 10);

        expect(mockApiClient.get).toHaveBeenCalledWith('/media-descriptions/trending/list?skip=5&limit=10');
        expect(result).toEqual([mockMediaDescription]);
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

        expect(mockApiClient.get).toHaveBeenCalledWith('/video-files?');
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

        expect(mockApiClient.get).toHaveBeenCalledWith('/video-files?skip=10&limit=5');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getVideoFile', () => {
      it('should fetch single video file', async () => {
        mockApiClient.get.mockResolvedValue({ data: mockVideoFile });

        const result = await mediaApi.getVideoFile('video-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/video-files/video-1');
        expect(result).toEqual(mockVideoFile);
      });
    });

    describe('createVideoFile', () => {
      it('should create new video file', async () => {
        mockApiClient.post.mockResolvedValue({ data: mockVideoFile });

        const createData = {
          file_name: 'test_video.mp4',
        };

        const result = await mediaApi.createVideoFile(createData);

        expect(mockApiClient.post).toHaveBeenCalledWith('/video-files', createData);
        expect(result).toEqual(mockVideoFile);
      });
    });

    describe('updateVideoFile', () => {
      it('should update video file', async () => {
        const updatedVideoFile = { ...mockVideoFile, encoding_status: 'processing' as const };
        mockApiClient.put.mockResolvedValue({ data: updatedVideoFile });

        const updateData = { encoding_status: 'processing' as const };
        const result = await mediaApi.updateVideoFile('video-1', updateData);

        expect(mockApiClient.put).toHaveBeenCalledWith('/video-files/video-1', updateData);
        expect(result).toEqual(updatedVideoFile);
      });
    });

    describe('deleteVideoFile', () => {
      it('should delete video file', async () => {
        mockApiClient.delete.mockResolvedValue({ data: mockVideoFile });

        const result = await mediaApi.deleteVideoFile('video-1');

        expect(mockApiClient.delete).toHaveBeenCalledWith('/video-files/video-1');
        expect(result).toEqual(mockVideoFile);
      });
    });
  });

  describe('Video File Management', () => {
    describe('getVideoFilesByMedia', () => {
      it('should fetch video files by media ID', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockVideoFile] });

        const result = await mediaApi.getVideoFilesByMedia('media-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/video-files/by-media/media-1');
        expect(result).toEqual([mockVideoFile]);
      });
    });

    describe('getMediaDescriptionsByVideo', () => {
      it('should fetch media descriptions by video file ID', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockMediaDescription] });

        const result = await mediaApi.getMediaDescriptionsByVideo('video-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/media-descriptions/by-video/video-1');
        expect(result).toEqual([mockMediaDescription]);
      });
    });

    describe('getUnlinkedVideoFiles', () => {
      it('should fetch unlinked video files', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockVideoFile] });

        const result = await mediaApi.getUnlinkedVideoFiles(10, 5);

        expect(mockApiClient.get).toHaveBeenCalledWith('/video-files/unlinked/list?skip=10&limit=5');
        expect(result).toEqual([mockVideoFile]);
      });
    });

    describe('linkVideoToMedia', () => {
      it('should link video file to media', async () => {
        mockApiClient.post.mockResolvedValue({ data: mockVideoFile });

        const result = await mediaApi.linkVideoToMedia('video-1', 'media-1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/video-files/video-1/link/media-1');
        expect(result).toEqual(mockVideoFile);
      });
    });

    describe('updateEncodingStatus', () => {
      it('should update encoding status without logs', async () => {
        mockApiClient.put.mockResolvedValue({ data: mockVideoFile });

        const result = await mediaApi.updateEncodingStatus('video-1', 'completed');

        expect(mockApiClient.put).toHaveBeenCalledWith('/video-files/video-1/encoding-status', {
          status: 'completed',
          logs: undefined,
        });
        expect(result).toEqual(mockVideoFile);
      });

      it('should update encoding status with logs', async () => {
        mockApiClient.put.mockResolvedValue({ data: mockVideoFile });

        const result = await mediaApi.updateEncodingStatus('video-1', 'failed', 'Encoding error occurred');

        expect(mockApiClient.put).toHaveBeenCalledWith('/video-files/video-1/encoding-status', {
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
          '/video-files/upload',
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
        };

        const result = await mediaApi.createVideoFileMetadata(data);

        expect(mockApiClient.post).toHaveBeenCalledWith('/video-files/create-metadata', data);
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

        expect(mockApiClient.post).toHaveBeenCalledWith('/video-files/create-metadata', data);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('createVideoFileWithExistingUrl', () => {
      it('should create video file with existing URL', async () => {
        mockApiClient.post.mockResolvedValue({ data: mockVideoFile });

        const data = {
          file_name: 'existing_video.mp4',
          external_url: 'https://example.com/video.mp4',
        };

        const result = await mediaApi.createVideoFileWithExistingUrl(data);

        expect(mockApiClient.post).toHaveBeenCalledWith('/video-files/create-with-existing-url', data);
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
          '/video-files/video-1/upload-file',
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

        expect(mockApiClient.post).toHaveBeenCalledWith('/video-files/video-1/test');
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

        expect(mockApiClient.post).toHaveBeenCalledWith('/media-descriptions/bulk', bulkRequest);
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

        expect(mockApiClient.get).toHaveBeenCalledWith('/description-reports?skip=10&limit=5');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getDescriptionReport', () => {
      it('should fetch single description report', async () => {
        mockApiClient.get.mockResolvedValue({ data: mockDescriptionReport });

        const result = await mediaApi.getDescriptionReport('report-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/description-reports/report-1');
        expect(result).toEqual(mockDescriptionReport);
      });
    });

    describe('getDescriptionReportsByBatch', () => {
      it('should fetch description reports by batch', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockDescriptionReport] });

        const result = await mediaApi.getDescriptionReportsByBatch('batch-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/description-reports/batch/batch-1');
        expect(result).toEqual([mockDescriptionReport]);
      });
    });

    describe('getDescriptionReportsByDescription', () => {
      it('should fetch description reports by description ID', async () => {
        mockApiClient.get.mockResolvedValue({ data: [mockDescriptionReport] });

        const result = await mediaApi.getDescriptionReportsByDescription('media-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/description-reports/description/media-1');
        expect(result).toEqual([mockDescriptionReport]);
      });
    });
  });

  describe('Relationship Object Support', () => {
    it('should return media description with relationship objects', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockMediaDescription });

      const result = await mediaApi.getMediaDescription('media-1');

      expect(result.actors).toBeDefined();
      expect(result.actors).toHaveLength(2);
      expect(result.actors?.[0].full_name).toBe('Yoo Jae-suk');
      expect(result.actors?.[0].role_type).toBe('main_actor');
      
      expect(result.directors).toBeDefined();
      expect(result.directors).toHaveLength(1);
      expect(result.directors?.[0].full_name).toBe('Jo Hyo-jin');
      
      expect(result.producers).toBeDefined();
      expect(result.producers).toHaveLength(1);
      
      expect(result.media_themes).toBeDefined();
      expect(result.media_themes).toHaveLength(2);
      expect(result.media_themes?.[0].theme_name).toBe('variety');
      
      expect(result.additional_images).toBeDefined();
      expect(result.additional_images).toHaveLength(2);
    });

    it('should support backward compatibility with deprecated ID list fields', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockMediaDescription });

      const result = await mediaApi.getMediaDescription('media-1');

      // Deprecated fields should still exist for backward compatibility
      expect(result.actors_id_list).toEqual(['person-1', 'person-2']);
      expect(result.directors_id_list).toEqual(['person-3']);
      expect(result.producers_id_list).toEqual(['person-4']);
      expect(result.additional_images_id_list).toEqual(['image-1', 'image-2']);
    });

    it('should handle media descriptions without relationship objects', async () => {
      const minimalMediaDescription: MediaDescription = {
        id: 'media-minimal',
        creation_date_utc: '2024-01-15T10:30:00Z',
        file_number: 1247,
        episode_title: 'Minimal Episode',
        media_type: 'video',
      };

      mockApiClient.get.mockResolvedValue({ data: minimalMediaDescription });

      const result = await mediaApi.getMediaDescription('media-minimal');

      expect(result.actors).toBeUndefined();
      expect(result.directors).toBeUndefined();
      expect(result.producers).toBeUndefined();
      expect(result.media_themes).toBeUndefined();
      expect(result.additional_images).toBeUndefined();
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

      expect(mockApiClient.get).toHaveBeenCalledWith('/media-descriptions?');
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

      expect(mockApiClient.get).toHaveBeenCalledWith(`/media-descriptions/${specialId}`);
    });
  });

  // API 1.13 New Features Tests
  describe('API 1.13 New Features', () => {
    describe('patchMediaDescription', () => {
      it('should perform partial update on media description', async () => {
        const partialUpdate = {
          is_featured: true,
          content_status: 'published' as const
        };

        mockApiClient.patch.mockResolvedValue({ data: { ...mockMediaDescription, ...partialUpdate } });

        const result = await mediaApi.patchMediaDescription('media-1', partialUpdate);

        expect(mockApiClient.patch).toHaveBeenCalledWith('/media-descriptions/media-1', partialUpdate);
        expect(result.is_featured).toBe(true);
        expect(result.content_status).toBe('published');
      });

      it('should handle patch with single field', async () => {
        const singleFieldUpdate = { episode_title: 'Updated Title' };

        mockApiClient.patch.mockResolvedValue({ data: { ...mockMediaDescription, ...singleFieldUpdate } });

        const result = await mediaApi.patchMediaDescription('media-1', singleFieldUpdate);

        expect(mockApiClient.patch).toHaveBeenCalledWith('/media-descriptions/media-1', singleFieldUpdate);
        expect(result.episode_title).toBe('Updated Title');
      });
    });

    describe('createMediaDescriptionFromText', () => {
      it('should create media description from text inputs', async () => {
        const textData = {
          episode_title: 'Adventure Begins',
          media_type: 'video' as const,
          program_name: 'Adventure Series',
          season_name: 'Season 1',
          actor_names: ['John Actor', 'Jane Actress'],
          director_names: ['Famous Director'],
          theme_names: ['Action', 'Adventure'],
          available_country_names: ['United States', 'Canada'],
          image_1920_1080_filename: 'poster.jpg'
        };

        const expectedResponse = {
          ...mockMediaDescription,
          episode_title: 'Adventure Begins',
          actors: [
            { id: 'actor-1', stage_name_roman: 'John Actor' },
            { id: 'actor-2', stage_name_roman: 'Jane Actress' }
          ],
          directors: [
            { id: 'director-1', stage_name_roman: 'Famous Director' }
          ]
        };

        mockApiClient.post.mockResolvedValue({ data: expectedResponse });

        const result = await mediaApi.createMediaDescriptionFromText(textData);

        expect(mockApiClient.post).toHaveBeenCalledWith('/media-descriptions/from-text', textData);
        expect(result.episode_title).toBe('Adventure Begins');
        expect(result.actors).toHaveLength(2);
        expect(result.directors).toHaveLength(1);
      });

      it('should handle optional fields in text conversion', async () => {
        const minimalTextData = {
          episode_title: 'Simple Episode',
          media_type: 'video' as const
        };

        mockApiClient.post.mockResolvedValue({ data: { ...mockMediaDescription, ...minimalTextData } });

        const result = await mediaApi.createMediaDescriptionFromText(minimalTextData);

        expect(mockApiClient.post).toHaveBeenCalledWith('/media-descriptions/from-text', minimalTextData);
        expect(result.episode_title).toBe('Simple Episode');
      });
    });

    describe('destroyVideoFile', () => {
      it('should destroy video file successfully', async () => {
        const mockResponse = {
          success: true,
          message: 'Video file destroyed successfully'
        };

        mockApiClient.post.mockResolvedValue({ data: mockResponse });

        const result = await mediaApi.destroyVideoFile('video-1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/video-files/video-1/destroy');
        expect(result.success).toBe(true);
        expect(result.message).toBe('Video file destroyed successfully');
      });

      it('should handle destroy errors', async () => {
        const mockError = {
          response: {
            status: 404,
            data: { detail: 'Video file not found' }
          }
        };

        mockApiClient.post.mockRejectedValue(mockError);

        await expect(mediaApi.destroyVideoFile('non-existent')).rejects.toEqual(mockError);
      });
    });

    describe('generatePlaybackToken', () => {
      it('should generate playback token with default expiration', async () => {
        const mockTokenResponse = {
          success: true,
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          playback_url: 'https://stream.mux.com/playback-id.m3u8?token=...',
          playback_id: 'playback-id-123',
          expires_in_minutes: 60,
          expires_at: 1642678800
        };

        mockApiClient.post.mockResolvedValue({ data: mockTokenResponse });

        const result = await mediaApi.generatePlaybackToken('video-1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/video-files/video-1/playback-token?expiration_minutes=60');
        expect(result.success).toBe(true);
        expect(result.token).toBeTruthy();
        expect(result.playback_url).toContain('token=');
        expect(result.expires_in_minutes).toBe(60);
      });

      it('should generate playback token with custom expiration', async () => {
        const mockTokenResponse = {
          success: true,
          token: 'custom-token',
          playback_url: 'https://stream.mux.com/playback-id.m3u8?token=custom-token',
          playback_id: 'playback-id-123',
          expires_in_minutes: 120,
          expires_at: 1642685600
        };

        mockApiClient.post.mockResolvedValue({ data: mockTokenResponse });

        const result = await mediaApi.generatePlaybackToken('video-1', 120);

        expect(mockApiClient.post).toHaveBeenCalledWith('/video-files/video-1/playback-token?expiration_minutes=120');
        expect(result.expires_in_minutes).toBe(120);
      });
    });

    describe('generateDrmToken', () => {
      it('should generate DRM token with default parameters', async () => {
        const mockDrmResponse = {
          success: true,
          token: 'drm-token-123',
          expires_in_minutes: 60,
          expires_at: 1642678800
        };

        mockApiClient.post.mockResolvedValue({ data: mockDrmResponse });

        const result = await mediaApi.generateDrmToken('video-1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/video-files/video-1/drm-token?expiration_minutes=60');
        expect(result.success).toBe(true);
        expect(result.token).toBe('drm-token-123');
      });

      it('should generate DRM token with custom key ID', async () => {
        const mockDrmResponse = {
          success: true,
          token: 'drm-token-with-key',
          drm_key_id: 'custom-key-123',
          expires_in_minutes: 120,
          expires_at: 1642685600
        };

        mockApiClient.post.mockResolvedValue({ data: mockDrmResponse });

        const result = await mediaApi.generateDrmToken('video-1', 120, 'custom-key-123');

        expect(mockApiClient.post).toHaveBeenCalledWith('/video-files/video-1/drm-token?expiration_minutes=120&drm_key_id=custom-key-123');
        expect(result.drm_key_id).toBe('custom-key-123');
        expect(result.expires_in_minutes).toBe(120);
      });
    });

    describe('getTokenInfo', () => {
      it('should get token information', async () => {
        const mockTokenInfo = {
          token_type: 'playback' as const,
          expires_at: 1642678800,
          is_expired: false,
          playback_id: 'playback-id-123'
        };

        mockApiClient.get.mockResolvedValue({ data: mockTokenInfo });

        const result = await mediaApi.getTokenInfo('video-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/video-files/video-1/token-info');
        expect(result.token_type).toBe('playback');
        expect(result.is_expired).toBe(false);
        expect(result.playback_id).toBe('playback-id-123');
      });

      it('should handle expired token info', async () => {
        const mockExpiredTokenInfo = {
          token_type: 'drm' as const,
          expires_at: 1642592400, // Past timestamp
          is_expired: true,
          drm_key_id: 'expired-key'
        };

        mockApiClient.get.mockResolvedValue({ data: mockExpiredTokenInfo });

        const result = await mediaApi.getTokenInfo('video-1');

        expect(result.is_expired).toBe(true);
        expect(result.token_type).toBe('drm');
      });
    });

    describe('completeFromMux', () => {
      it('should complete video data from Mux', async () => {
        const completedVideoFile = {
          ...mockVideoFile,
          duration_seconds: 3600,
          max_resolution_width: 1920,
          max_resolution_height: 1080,
          mux_asset_id: 'mux-asset-123',
          mux_playback_id: 'mux-playback-456',
          encoding_status: 'completed' as const
        };

        mockApiClient.post.mockResolvedValue({ data: completedVideoFile });

        const result = await mediaApi.completeFromMux('video-1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/video-files/video-1/complete-from-mux');
        expect(result.duration_seconds).toBe(3600);
        expect(result.mux_asset_id).toBe('mux-asset-123');
        expect(result.encoding_status).toBe('completed');
      });

      it('should handle Mux completion errors', async () => {
        const mockError = {
          response: {
            status: 404,
            data: { detail: 'Asset not found in Mux' }
          }
        };

        mockApiClient.post.mockRejectedValue(mockError);

        await expect(mediaApi.completeFromMux('video-1')).rejects.toEqual(mockError);
      });
    });

    describe('Audio Language Management', () => {
      describe('addAudioLanguage', () => {
        it('should add audio language to video file', async () => {
          const mockResponse = {
            success: true,
            message: 'Audio language added successfully'
          };

          mockApiClient.post.mockResolvedValue({ data: mockResponse });

          const result = await mediaApi.addAudioLanguage('video-1', 'language-1');

          expect(mockApiClient.post).toHaveBeenCalledWith('/video-files/video-1/audio_languages/language-1');
          expect(result.success).toBe(true);
        });
      });

      describe('removeAudioLanguage', () => {
        it('should remove audio language from video file', async () => {
          const mockResponse = {
            success: true,
            message: 'Audio language removed successfully'
          };

          mockApiClient.delete.mockResolvedValue({ data: mockResponse });

          const result = await mediaApi.removeAudioLanguage('video-1', 'language-1');

          expect(mockApiClient.delete).toHaveBeenCalledWith('/video-files/video-1/audio_languages/language-1');
          expect(result.success).toBe(true);
        });
      });

      describe('updateAllAudioLanguages', () => {
        it('should update all audio languages for video file', async () => {
          const languageIds = ['lang-1', 'lang-2', 'lang-3'];
          const mockResponse = {
            success: true,
            message: 'Audio languages updated successfully'
          };

          mockApiClient.put.mockResolvedValue({ data: mockResponse });

          const result = await mediaApi.updateAllAudioLanguages('video-1', languageIds);

          expect(mockApiClient.put).toHaveBeenCalledWith('/video-files/video-1/audio_languages', languageIds);
          expect(result.success).toBe(true);
        });

        it('should handle empty language array', async () => {
          const mockResponse = {
            success: true,
            message: 'All audio languages removed'
          };

          mockApiClient.put.mockResolvedValue({ data: mockResponse });

          const result = await mediaApi.updateAllAudioLanguages('video-1', []);

          expect(mockApiClient.put).toHaveBeenCalledWith('/video-files/video-1/audio_languages', []);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('Relationship Objects (API 1.13)', () => {
      it('should handle media description with relationship objects', async () => {
        const mediaWithRelationships = {
          ...mockMediaDescription,
          // Request format (arrays of IDs)
          actor_ids: ['actor-1', 'actor-2'],
          director_ids: ['director-1'],
          media_theme_ids: ['theme-1', 'theme-2'],
          // Response format (relationship objects)
          actors: [
            { id: 'actor-1', stage_name_roman: 'John Actor' },
            { id: 'actor-2', stage_name_roman: 'Jane Actress' }
          ],
          directors: [
            { id: 'director-1', stage_name_roman: 'Famous Director' }
          ],
          media_themes: [
            { id: 'theme-1', name: 'Action' },
            { id: 'theme-2', name: 'Adventure' }
          ]
        };

        mockApiClient.get.mockResolvedValue({ data: mediaWithRelationships });

        const result = await mediaApi.getMediaDescription('media-1');

        expect(result.actors).toHaveLength(2);
        expect(result.directors).toHaveLength(1);
        expect(result.media_themes).toHaveLength(2);
        expect(result.actors![0].stage_name_roman).toBe('John Actor');
        expect(result.media_themes![0].name).toBe('Action');
      });

      it('should create media description with new relationship format', async () => {
        const createData = {
          episode_title: 'Episode with Relations',
          media_type: 'video' as const,
          actor_ids: ['actor-1', 'actor-2'],
          director_ids: ['director-1'],
          origin_country_ids: ['country-1'],
          media_theme_ids: ['theme-1']
        };

        mockApiClient.post.mockResolvedValue({ data: { ...mockMediaDescription, ...createData } });

        const result = await mediaApi.createMediaDescription(createData);

        expect(mockApiClient.post).toHaveBeenCalledWith('/media-descriptions', createData);
        expect(result.episode_title).toBe('Episode with Relations');
      });
    });

    describe('Content Status Management (API 1.13)', () => {
      it('should handle all content status types', async () => {
        const statusTypes = ['draft', 'published', 'archived', 'scheduled'] as const;

        for (const status of statusTypes) {
          const mediaWithStatus = { ...mockMediaDescription, content_status: status };
          mockApiClient.patch.mockResolvedValue({ data: mediaWithStatus });

          const result = await mediaApi.patchMediaDescription('media-1', { content_status: status });

          expect(result.content_status).toBe(status);
        }
      });
    });

    describe('Media Categories (API 1.13)', () => {
      it('should handle media categories list', async () => {
        const mediaWithCategories = {
          ...mockMediaDescription,
          media_categories_list: ['drama', 'musical', 'animation']
        };

        mockApiClient.post.mockResolvedValue({ data: mediaWithCategories });

        const result = await mediaApi.createMediaDescription({
          episode_title: 'Categorized Content',
          media_type: 'video',
          media_categories_list: ['drama', 'musical', 'animation']
        });

        expect(result.media_categories_list).toEqual(['drama', 'musical', 'animation']);
      });
    });
  });
});