import { describe, it, expect } from 'vitest';
import type { VideoFile } from '../types';

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
    expect(minimalVideoFile.media_description_id).toBeUndefined();
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
});