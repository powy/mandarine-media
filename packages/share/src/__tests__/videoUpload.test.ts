import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUploadOptions, formatFileSize, formatDuration } from '../utils/videoUpload';
import type { VideoUploadOptions } from '../utils/videoUpload';

// Mock File constructor for tests
const createMockFile = (type: string, size: number, name: string = 'test.mp4'): File => {
  return {
    type,
    size,
    name,
  } as File;
};

describe('validateUploadOptions', () => {
  it('should pass validation for valid new upload options', () => {
    const mockFile = createMockFile('video/mp4', 1000000);
    const options: VideoUploadOptions = {
      fileName: 'test.mp4',
      uploadMethod: 'new_upload',
      file: mockFile,
    };
    
    const errors = validateUploadOptions(options);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation for valid existing URL options', () => {
    const options: VideoUploadOptions = {
      fileName: 'test.mp4',
      uploadMethod: 'existing_url',
      externalUrl: 'https://example.com/video.mp4',
    };
    
    const errors = validateUploadOptions(options);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for empty file name', () => {
    const options: VideoUploadOptions = {
      fileName: '',
      uploadMethod: 'new_upload',
    };
    
    const errors = validateUploadOptions(options);
    expect(errors).toContain('File name is required');
  });

  it('should fail validation for new upload without file', () => {
    const options: VideoUploadOptions = {
      fileName: 'test.mp4',
      uploadMethod: 'new_upload',
    };
    
    const errors = validateUploadOptions(options);
    expect(errors).toContain('File is required for new upload method');
  });

  it('should fail validation for existing URL without URL', () => {
    const options: VideoUploadOptions = {
      fileName: 'test.mp4',
      uploadMethod: 'existing_url',
    };
    
    const errors = validateUploadOptions(options);
    expect(errors).toContain('External URL is required for existing URL upload method');
  });

  it('should fail validation for invalid URL', () => {
    const options: VideoUploadOptions = {
      fileName: 'test.mp4',
      uploadMethod: 'existing_url',
      externalUrl: 'not-a-valid-url',
    };
    
    const errors = validateUploadOptions(options);
    expect(errors).toContain('External URL must be a valid URL');
  });

  it('should fail validation for invalid file type', () => {
    const mockFile = createMockFile('text/plain', 1000000);
    const options: VideoUploadOptions = {
      fileName: 'test.txt',
      uploadMethod: 'new_upload',
      file: mockFile,
    };
    
    const errors = validateUploadOptions(options);
    expect(errors).toContain('File must be a valid video file');
  });
});

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  it('should handle decimal places', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2621440)).toBe('2.5 MB');
  });
});

describe('formatDuration', () => {
  it('should format duration in minutes and seconds', () => {
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(30)).toBe('0:30');
  });

  it('should format duration with hours', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(7200)).toBe('2:00:00');
  });

  it('should handle zero duration', () => {
    expect(formatDuration(0)).toBe('0:00');
  });
});