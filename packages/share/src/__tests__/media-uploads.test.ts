import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mediaUploadsApi } from '../api/media-uploads';
import { apiClient } from '../api/client';
import type {
  VideoUploadResponse,
  WebcomicUploadResponse,
  StorageBackendsResponse,
  DeleteFileResponse
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

describe('Media Uploads API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockVideoUploadResponse: VideoUploadResponse = {
    success: true,
    message: 'Video file uploaded successfully',
    video_file_id: 'video-123',
    file_url: 'https://s3.amazonaws.com/bucket/video.mp4',
    backend: 's3',
    encoding_status: 'pending',
    linked_to_media: true
  };

  const mockWebcomicUploadResponse: WebcomicUploadResponse = {
    success: true,
    message: 'Webcomic uploaded successfully with 3 pages',
    files: [
      {
        id: 'file-1',
        file_url: 'https://s3.amazonaws.com/bucket/page1.jpg',
        file_name: 'page_001.jpg',
        page_number: 1
      },
      {
        id: 'file-2', 
        file_url: 'https://s3.amazonaws.com/bucket/page2.jpg',
        file_name: 'page_002.jpg',
        page_number: 2
      },
      {
        id: 'file-3',
        file_url: 'https://s3.amazonaws.com/bucket/page3.jpg', 
        file_name: 'page_003.jpg',
        page_number: 3
      }
    ],
    total_pages: 3,
    backend: 's3',
    linked_to_media: true,
    chapter_number: 1
  };

  const mockStorageBackendsResponse: StorageBackendsResponse = {
    available_backends: ['s3', 'mux', 'local'],
    backend_details: {
      s3: {
        name: 'Amazon S3',
        supports: ['video', 'images'],
        max_file_size: 5368709120 // 5GB
      },
      mux: {
        name: 'Mux Video',
        supports: ['video'],
        max_file_size: 10737418240 // 10GB
      },
      local: {
        name: 'Local Storage',
        supports: ['video', 'images'],
        max_file_size: 1073741824 // 1GB
      }
    },
    media_type_routing: {
      video: ['mux', 's3'],
      webtoon: ['s3', 'local']
    }
  };

  const mockDeleteFileResponse: DeleteFileResponse = {
    success: true,
    message: 'File deleted successfully'
  };

  describe('uploadVideo', () => {
    it('should upload video file without media description ID', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockVideoUploadResponse });

      const file = new File(['video content'], 'test_video.mp4', { type: 'video/mp4' });
      const result = await mediaUploadsApi.uploadVideo(file);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/upload/video',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Verify FormData content
      const formDataCall = mockApiClient.post.mock.calls[0][1];
      expect(formDataCall).toBeInstanceOf(FormData);
      expect(formDataCall.get('file')).toEqual(file);
      expect(formDataCall.get('media_description_id')).toBeNull();

      expect(result).toEqual(mockVideoUploadResponse);
    });

    it('should upload video file with media description ID', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockVideoUploadResponse });

      const file = new File(['video content'], 'test_video.mp4', { type: 'video/mp4' });
      const mediaDescriptionId = 'media-456';
      
      const result = await mediaUploadsApi.uploadVideo(file, mediaDescriptionId);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/upload/video',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Verify FormData content
      const formDataCall = mockApiClient.post.mock.calls[0][1];
      expect(formDataCall).toBeInstanceOf(FormData);
      expect(formDataCall.get('file')).toEqual(file);
      expect(formDataCall.get('media_description_id')).toBe(mediaDescriptionId);

      expect(result).toEqual(mockVideoUploadResponse);
    });

    it('should handle video upload failure', async () => {
      const errorResponse = {
        response: {
          status: 413,
          data: {
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'File size exceeds maximum limit'
            }
          }
        }
      };

      mockApiClient.post.mockRejectedValue(errorResponse);

      const file = new File(['large video content'], 'large_video.mp4', { type: 'video/mp4' });

      await expect(mediaUploadsApi.uploadVideo(file)).rejects.toEqual(errorResponse);
    });

    it('should handle different video file formats', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockVideoUploadResponse });

      const videoFormats = [
        { name: 'test.mp4', type: 'video/mp4' },
        { name: 'test.avi', type: 'video/avi' },
        { name: 'test.mov', type: 'video/quicktime' },
        { name: 'test.mkv', type: 'video/x-matroska' }
      ];

      for (const format of videoFormats) {
        const file = new File(['video content'], format.name, { type: format.type });
        await mediaUploadsApi.uploadVideo(file);
        
        expect(mockApiClient.post).toHaveBeenCalled();
      }
    });
  });

  describe('uploadWebcomic', () => {
    it('should upload multiple webcomic images without metadata', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockWebcomicUploadResponse });

      const files = [
        new File(['image1'], 'page1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'page2.jpg', { type: 'image/jpeg' }),
        new File(['image3'], 'page3.jpg', { type: 'image/jpeg' })
      ];

      const result = await mediaUploadsApi.uploadWebcomic(files);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/upload/webcomic',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Verify FormData content
      const formDataCall = mockApiClient.post.mock.calls[0][1];
      expect(formDataCall).toBeInstanceOf(FormData);
      expect(formDataCall.getAll('files')).toHaveLength(3);
      expect(formDataCall.get('media_description_id')).toBeNull();
      expect(formDataCall.get('chapter_number')).toBeNull();

      expect(result).toEqual(mockWebcomicUploadResponse);
    });

    it('should upload webcomic images with full metadata', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockWebcomicUploadResponse });

      const files = [
        new File(['image1'], 'page1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'page2.jpg', { type: 'image/jpeg' })
      ];
      const mediaDescriptionId = 'webtoon-789';
      const chapterNumber = 5;

      const result = await mediaUploadsApi.uploadWebcomic(files, mediaDescriptionId, chapterNumber);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/upload/webcomic',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Verify FormData content
      const formDataCall = mockApiClient.post.mock.calls[0][1];
      expect(formDataCall).toBeInstanceOf(FormData);
      expect(formDataCall.getAll('files')).toHaveLength(2);
      expect(formDataCall.get('media_description_id')).toBe(mediaDescriptionId);
      expect(formDataCall.get('chapter_number')).toBe(chapterNumber.toString());

      expect(result).toEqual(mockWebcomicUploadResponse);
    });

    it('should handle webcomic upload failure', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'INVALID_FILE_TYPE',
              message: 'Some files are not valid image formats'
            }
          }
        }
      };

      mockApiClient.post.mockRejectedValue(errorResponse);

      const files = [
        new File(['not an image'], 'invalid.txt', { type: 'text/plain' })
      ];

      await expect(mediaUploadsApi.uploadWebcomic(files)).rejects.toEqual(errorResponse);
    });

    it('should handle different image formats', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockWebcomicUploadResponse });

      const imageFormats = [
        { name: 'page1.jpg', type: 'image/jpeg' },
        { name: 'page2.png', type: 'image/png' },
        { name: 'page3.webp', type: 'image/webp' },
        { name: 'page4.gif', type: 'image/gif' }
      ];

      const files = imageFormats.map(format => 
        new File(['image content'], format.name, { type: format.type })
      );

      const result = await mediaUploadsApi.uploadWebcomic(files);

      expect(mockApiClient.post).toHaveBeenCalled();
      expect(result).toEqual(mockWebcomicUploadResponse);
    });

    it('should handle single image upload', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockWebcomicUploadResponse });

      const file = new File(['single image'], 'single_page.jpg', { type: 'image/jpeg' });
      const result = await mediaUploadsApi.uploadWebcomic([file]);

      expect(mockApiClient.post).toHaveBeenCalled();
      expect(result).toEqual(mockWebcomicUploadResponse);
    });

    it('should handle chapter number edge cases', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockWebcomicUploadResponse });

      const file = new File(['image'], 'page.jpg', { type: 'image/jpeg' });
      
      // Test with chapter number 0
      await mediaUploadsApi.uploadWebcomic([file], undefined, 0);
      
      let formDataCall = mockApiClient.post.mock.calls[0][1];
      expect(formDataCall.get('chapter_number')).toBe('0');

      // Test with large chapter number
      await mediaUploadsApi.uploadWebcomic([file], undefined, 9999);
      
      formDataCall = mockApiClient.post.mock.calls[1][1];
      expect(formDataCall.get('chapter_number')).toBe('9999');
    });
  });

  describe('getAvailableBackends', () => {
    it('should fetch available storage backends', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockStorageBackendsResponse });

      const result = await mediaUploadsApi.getAvailableBackends();

      expect(mockApiClient.get).toHaveBeenCalledWith('/upload/backends');
      expect(result).toEqual(mockStorageBackendsResponse);
    });

    it('should handle backend fetch failure', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to retrieve backend information'
            }
          }
        }
      };

      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(mediaUploadsApi.getAvailableBackends()).rejects.toEqual(errorResponse);
    });

    it('should handle empty backends response', async () => {
      const emptyResponse: StorageBackendsResponse = {
        available_backends: [],
        backend_details: {},
        media_type_routing: {}
      };

      mockApiClient.get.mockResolvedValue({ data: emptyResponse });

      const result = await mediaUploadsApi.getAvailableBackends();

      expect(result).toEqual(emptyResponse);
      expect(result.available_backends).toHaveLength(0);
    });
  });

  describe('deleteFile', () => {
    it('should delete file by URL only', async () => {
      mockApiClient.delete.mockResolvedValue({ data: mockDeleteFileResponse });

      const fileUrl = 'https://s3.amazonaws.com/bucket/file_to_delete.mp4';
      const result = await mediaUploadsApi.deleteFile(fileUrl);

      expect(mockApiClient.delete).toHaveBeenCalledWith(`/upload/file?file_url=${encodeURIComponent(fileUrl)}`);
      expect(result).toEqual(mockDeleteFileResponse);
    });

    it('should delete file with specific backend', async () => {
      mockApiClient.delete.mockResolvedValue({ data: mockDeleteFileResponse });

      const fileUrl = 'https://s3.amazonaws.com/bucket/file_to_delete.mp4';
      const backend = 's3';
      
      const result = await mediaUploadsApi.deleteFile(fileUrl, backend);

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        `/upload/file?file_url=${encodeURIComponent(fileUrl)}&backend=${encodeURIComponent(backend)}`
      );
      expect(result).toEqual(mockDeleteFileResponse);
    });

    it('should handle file deletion failure', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: {
            error: {
              code: 'FILE_NOT_FOUND',
              message: 'File not found or already deleted'
            }
          }
        }
      };

      mockApiClient.delete.mockRejectedValue(errorResponse);

      const fileUrl = 'https://s3.amazonaws.com/bucket/nonexistent.mp4';

      await expect(mediaUploadsApi.deleteFile(fileUrl)).rejects.toEqual(errorResponse);
    });

    it('should handle URL encoding for file paths with special characters', async () => {
      mockApiClient.delete.mockResolvedValue({ data: mockDeleteFileResponse });

      const complexFileUrl = 'https://s3.amazonaws.com/bucket/path with spaces/file@#$%.mp4';
      
      await mediaUploadsApi.deleteFile(complexFileUrl);

      // URL encoding can use either %20 or + for spaces, both are valid
      const expectedUrl = `/upload/file?file_url=${encodeURIComponent(complexFileUrl)}`;
      const actualCall = mockApiClient.delete.mock.calls[0][0];
      
      // Check that the base URL and encoding pattern is correct  
      // URLSearchParams.toString() uses + for spaces, so we expect + not %20
      expect(actualCall).toMatch(/^\/upload\/file\?file_url=https%3A%2F%2Fs3\.amazonaws\.com%2Fbucket%2Fpath\+with\+spaces%2Ffile%40%23%24%25\.mp4$/);
      expect(mockApiClient.delete).toHaveBeenCalledTimes(1);
    });

    it('should handle deletion with invalid backend parameter', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'INVALID_BACKEND',
              message: 'Specified backend is not available'
            }
          }
        }
      };

      mockApiClient.delete.mockRejectedValue(errorResponse);

      await expect(mediaUploadsApi.deleteFile('https://example.com/file.mp4', 'invalid_backend'))
        .rejects.toEqual(errorResponse);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      mockApiClient.post.mockRejectedValue(timeoutError);

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await expect(mediaUploadsApi.uploadVideo(file)).rejects.toThrow('Network timeout');
    });

    it('should handle empty file uploads', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'EMPTY_FILE',
              message: 'File cannot be empty'
            }
          }
        }
      };

      mockApiClient.post.mockRejectedValue(errorResponse);

      const emptyFile = new File([''], 'empty.mp4', { type: 'video/mp4' });

      await expect(mediaUploadsApi.uploadVideo(emptyFile)).rejects.toEqual(errorResponse);
    });

    it('should handle very large file names', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockVideoUploadResponse });

      const longFileName = 'a'.repeat(255) + '.mp4'; // Very long filename
      const file = new File(['content'], longFileName, { type: 'video/mp4' });

      await mediaUploadsApi.uploadVideo(file);

      expect(mockApiClient.post).toHaveBeenCalled();
    });

    it('should handle files without extensions', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockVideoUploadResponse });

      const file = new File(['content'], 'video_without_extension', { type: 'video/mp4' });

      await mediaUploadsApi.uploadVideo(file);

      expect(mockApiClient.post).toHaveBeenCalled();
    });

    it('should handle authentication errors', async () => {
      const authError = {
        response: {
          status: 401,
          data: {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            }
          }
        }
      };

      mockApiClient.post.mockRejectedValue(authError);

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await expect(mediaUploadsApi.uploadVideo(file)).rejects.toEqual(authError);
    });

    it('should handle permission errors', async () => {
      const permissionError = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Admin privileges required for file uploads'
            }
          }
        }
      };

      mockApiClient.post.mockRejectedValue(permissionError);

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await expect(mediaUploadsApi.uploadVideo(file)).rejects.toEqual(permissionError);
    });

    it('should handle server maintenance responses', async () => {
      const maintenanceError = {
        response: {
          status: 503,
          data: {
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Upload service temporarily unavailable'
            }
          }
        }
      };

      mockApiClient.post.mockRejectedValue(maintenanceError);

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await expect(mediaUploadsApi.uploadVideo(file)).rejects.toEqual(maintenanceError);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent uploads', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockVideoUploadResponse });

      const files = Array.from({ length: 5 }, (_, i) => 
        new File(['content'], `video${i}.mp4`, { type: 'video/mp4' })
      );

      const uploadPromises = files.map(file => mediaUploadsApi.uploadVideo(file));
      const results = await Promise.all(uploadPromises);

      expect(results).toHaveLength(5);
      expect(mockApiClient.post).toHaveBeenCalledTimes(5);
      results.forEach(result => {
        expect(result).toEqual(mockVideoUploadResponse);
      });
    });

    it('should handle mixed success/failure in concurrent uploads', async () => {
      mockApiClient.post
        .mockResolvedValueOnce({ data: mockVideoUploadResponse })
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce({ data: mockVideoUploadResponse });

      const files = [
        new File(['content1'], 'video1.mp4', { type: 'video/mp4' }),
        new File(['content2'], 'video2.mp4', { type: 'video/mp4' }),
        new File(['content3'], 'video3.mp4', { type: 'video/mp4' })
      ];

      const uploadPromises = files.map(file => 
        mediaUploadsApi.uploadVideo(file).catch(err => ({ error: err }))
      );
      
      const results = await Promise.all(uploadPromises);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(mockVideoUploadResponse);
      expect(results[1]).toHaveProperty('error');
      expect(results[2]).toEqual(mockVideoUploadResponse);
    });

    it('should preserve file metadata during upload', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockVideoUploadResponse });

      const originalFile = new File(['content'], 'test_video.mp4', {
        type: 'video/mp4',
        lastModified: Date.now()
      });

      await mediaUploadsApi.uploadVideo(originalFile);

      const formDataCall = mockApiClient.post.mock.calls[0][1];
      const uploadedFile = formDataCall.get('file');
      
      expect(uploadedFile.name).toBe(originalFile.name);
      expect(uploadedFile.type).toBe(originalFile.type);
      expect(uploadedFile.size).toBe(originalFile.size);
    });
  });
});