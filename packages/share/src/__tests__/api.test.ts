import { describe, it, expect } from 'vitest';
import type { 
  VideoFile, 
  VideoUploadResponse, 
  WebcomicUploadResponse, 
  StorageBackendsResponse,
  DeleteFileResponse 
} from '../types';

describe('API Types', () => {
  it('should have correct VideoFile interface structure', () => {
    // Test that required fields are present
    const mockVideoFile: VideoFile = {
      id: 'test-id',
      file_name: 'test.mp4',
      encoding_status: 'pending',
      upload_method: 'new_upload',
      upload_status: 'metadata_only',
      creation_date_utc: '2024-01-15T10:30:00Z',
    };

    // Basic type validation
    expect(typeof mockVideoFile.id).toBe('string');
    expect(typeof mockVideoFile.file_name).toBe('string');
    expect(typeof mockVideoFile.encoding_status).toBe('string');
    expect(mockVideoFile.upload_method).toBe('new_upload');
    expect(mockVideoFile.upload_status).toBe('metadata_only');
  });

  it('should handle optional fields correctly', () => {
    const minimalVideoFile: VideoFile = {
      id: 'test-id',
      file_name: 'test.mp4',
      encoding_status: 'pending',
      upload_method: 'existing_url',
      upload_status: 'upload_completed',
      creation_date_utc: '2024-01-15T10:30:00Z',
    };

    // Optional fields should be allowed to be undefined
    expect(minimalVideoFile.file_url).toBeUndefined();
    expect(minimalVideoFile.file_size_bytes).toBeUndefined();
  });

  it('should support both upload methods', () => {
    const newUploadFile: VideoFile = {
      id: 'test-id-1',
      file_name: 'new_upload.mp4',
      encoding_status: 'pending',
      upload_method: 'new_upload',
      upload_status: 'metadata_only',
      creation_date_utc: '2024-01-15T10:30:00Z',
    };

    const existingUrlFile: VideoFile = {
      id: 'test-id-2',
      file_name: 'existing.mp4',
      encoding_status: 'completed',
      upload_method: 'existing_url',
      upload_status: 'upload_completed',
      external_url: 'https://example.com/video.mp4',
      creation_date_utc: '2024-01-15T10:30:00Z',
    };

    expect(newUploadFile.upload_method).toBe('new_upload');
    expect(existingUrlFile.upload_method).toBe('existing_url');
    expect(existingUrlFile.external_url).toBe('https://example.com/video.mp4');
  });

  it('should have correct VideoUploadResponse interface structure', () => {
    const mockResponse: VideoUploadResponse = {
      success: true,
      message: 'Video file uploaded successfully',
      video_file_id: 'video-123',
      file_url: 'https://s3.amazonaws.com/bucket/video.mp4',
      backend: 's3',
      encoding_status: 'pending',
      linked_to_media: true
    };

    expect(typeof mockResponse.success).toBe('boolean');
    expect(typeof mockResponse.message).toBe('string');
    expect(typeof mockResponse.video_file_id).toBe('string');
    expect(typeof mockResponse.file_url).toBe('string');
    expect(typeof mockResponse.encoding_status).toBe('string');
    expect(typeof mockResponse.linked_to_media).toBe('boolean');
    expect(mockResponse.backend).toBe('s3');
  });

  it('should have correct WebcomicUploadResponse interface structure', () => {
    const mockResponse: WebcomicUploadResponse = {
      success: true,
      message: 'Webcomic uploaded successfully with 3 pages',
      files: [
        {
          id: 'file-1',
          file_url: 'https://s3.amazonaws.com/bucket/page1.jpg',
          file_name: 'page_001.jpg',
          page_number: 1
        }
      ],
      total_pages: 1,
      backend: 's3',
      linked_to_media: false,
      chapter_number: 1
    };

    expect(typeof mockResponse.success).toBe('boolean');
    expect(typeof mockResponse.message).toBe('string');
    expect(Array.isArray(mockResponse.files)).toBe(true);
    expect(typeof mockResponse.total_pages).toBe('number');
    expect(typeof mockResponse.linked_to_media).toBe('boolean');
    expect(typeof mockResponse.chapter_number).toBe('number');
    expect(typeof mockResponse.files[0].id).toBe('string');
    expect(typeof mockResponse.files[0].page_number).toBe('number');
  });

  it('should have correct StorageBackendsResponse interface structure', () => {
    const mockResponse: StorageBackendsResponse = {
      available_backends: ['s3', 'mux', 'local'],
      backend_details: {
        s3: {
          name: 'Amazon S3',
          supports: ['video', 'images']
        }
      },
      media_type_routing: {
        video: ['mux', 's3']
      }
    };

    expect(Array.isArray(mockResponse.available_backends)).toBe(true);
    expect(typeof mockResponse.backend_details).toBe('object');
    expect(typeof mockResponse.media_type_routing).toBe('object');
    expect(mockResponse.available_backends).toContain('s3');
  });

  it('should have correct DeleteFileResponse interface structure', () => {
    const mockResponse: DeleteFileResponse = {
      success: true,
      message: 'File deleted successfully'
    };

    expect(typeof mockResponse.success).toBe('boolean');
    expect(typeof mockResponse.message).toBe('string');
  });
});