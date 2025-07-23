import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

// Mock the shared API and hooks
vi.mock('share', () => ({
  useVideoUpload: vi.fn(),
  useVideoPlayback: vi.fn(),
  formatFileSize: (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`,
  formatDuration: (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`,
  mediaApi: {
    createVideoFileMetadata: vi.fn(),
    createVideoFileWithExistingUrl: vi.fn(),
    uploadFileToExistingMetadata: vi.fn(),
    testVideoFilePlayback: vi.fn(),
  },
}));

// Mock router hooks
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useParams: vi.fn(() => ({ id: 'test-id' })),
  };
});

// Import components after mocking
import { VideoFileForm } from '../components/forms/VideoFileForm';
import { VideoFileDetailPage } from '../pages/video-files/VideoFileDetailPage';
import { VideoFileListPage } from '../pages/video-files/VideoFileListPage';

describe('Video File Dual Upload Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('VideoFileForm Component', () => {
    const mockVideoUpload = {
      state: {
        isUploading: false,
        progress: null,
        error: null,
        videoFile: null,
      },
      upload: vi.fn(),
      reset: vi.fn(),
      validateOptions: vi.fn(() => []),
    };

    const mockVideoPlayback = {
      state: {
        isLoading: false,
        result: null,
        error: null,
      },
      testPlayback: vi.fn(),
      reset: vi.fn(),
    };

    beforeEach(() => {
      const { useVideoUpload, useVideoPlayback } = require('share');
      useVideoUpload.mockReturnValue(mockVideoUpload);
      useVideoPlayback.mockReturnValue(mockVideoPlayback);
    });

    it('should render upload method selection', () => {
      render(
        <BrowserRouter>
          <VideoFileForm />
        </BrowserRouter>
      );

      expect(screen.getByText('Upload Method')).toBeInTheDocument();
      expect(screen.getByLabelText(/Upload new file/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Use existing media URL/i)).toBeInTheDocument();
    });

    it('should show file upload section when new upload is selected', () => {
      render(
        <BrowserRouter>
          <VideoFileForm />
        </BrowserRouter>
      );

      const newUploadRadio = screen.getByLabelText(/Upload new file/i);
      fireEvent.click(newUploadRadio);

      expect(screen.getByText('File Upload')).toBeInTheDocument();
      expect(screen.getByText('Select Video File *')).toBeInTheDocument();
    });

    it('should show URL input when existing URL is selected', () => {
      render(
        <BrowserRouter>
          <VideoFileForm />
        </BrowserRouter>
      );

      const existingUrlRadio = screen.getByLabelText(/Use existing media URL/i);
      fireEvent.click(existingUrlRadio);

      expect(screen.getByText('External Media URL')).toBeInTheDocument();
      expect(screen.getByLabelText(/Media URL/i)).toBeInTheDocument();
    });

    it('should validate file name requirement', async () => {
      render(
        <BrowserRouter>
          <VideoFileForm />
        </BrowserRouter>
      );

      const submitButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('File name is required')).toBeInTheDocument();
      });
    });

    it('should validate external URL when existing URL method is selected', async () => {
      render(
        <BrowserRouter>
          <VideoFileForm />
        </BrowserRouter>
      );

      // Select existing URL method
      const existingUrlRadio = screen.getByLabelText(/Use existing media URL/i);
      fireEvent.click(existingUrlRadio);

      // Fill in file name but leave URL empty
      const fileNameInput = screen.getByLabelText(/File Name/i);
      fireEvent.change(fileNameInput, { target: { value: 'test.mp4' } });

      const submitButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('External URL is required')).toBeInTheDocument();
      });
    });

    it('should call upload function with correct parameters for new upload', async () => {
      render(
        <BrowserRouter>
          <VideoFileForm />
        </BrowserRouter>
      );

      // Fill in file name
      const fileNameInput = screen.getByLabelText(/File Name/i);
      fireEvent.change(fileNameInput, { target: { value: 'test-video.mp4' } });

      // Select a file (mock file input)
      const fileInput = screen.getByLabelText(/Select Video File/i);
      const file = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const submitButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockVideoUpload.upload).toHaveBeenCalledWith({
          fileName: 'test-video.mp4',
          uploadMethod: 'new_upload',
          mediaDescriptionId: undefined,
          externalUrl: undefined,
          file: file,
        });
      });
    });

    it('should call upload function with correct parameters for existing URL', async () => {
      render(
        <BrowserRouter>
          <VideoFileForm />
        </BrowserRouter>
      );

      // Select existing URL method
      const existingUrlRadio = screen.getByLabelText(/Use existing media URL/i);
      fireEvent.click(existingUrlRadio);

      // Fill in file name and URL
      const fileNameInput = screen.getByLabelText(/File Name/i);
      fireEvent.change(fileNameInput, { target: { value: 'existing-video.mp4' } });

      const urlInput = screen.getByLabelText(/Media URL/i);
      fireEvent.change(urlInput, { target: { value: 'https://example.com/video.mp4' } });

      const submitButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockVideoUpload.upload).toHaveBeenCalledWith({
          fileName: 'existing-video.mp4',
          uploadMethod: 'existing_url',
          mediaDescriptionId: undefined,
          externalUrl: 'https://example.com/video.mp4',
          file: undefined,
        });
      });
    });

    it('should show upload progress when uploading', () => {
      mockVideoUpload.state.isUploading = true;
      mockVideoUpload.state.progress = {
        stage: 'uploading' as const,
        progress: 50,
        message: 'Uploading file...',
      };

      render(
        <BrowserRouter>
          <VideoFileForm />
        </BrowserRouter>
      );

      expect(screen.getByText('Uploading file...')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should show success message when upload completes', () => {
      mockVideoUpload.state.videoFile = {
        id: 'test-video-id',
        file_name: 'test.mp4',
        encoding_status: 'pending',
        upload_method: 'new_upload' as const,
        upload_status: 'upload_completed' as const,
        creation_date_utc: '2024-01-15T10:30:00Z',
      };
      mockVideoUpload.state.progress = {
        stage: 'completed' as const,
        progress: 100,
        message: 'Upload successful',
        videoFileId: 'test-video-id',
      };

      render(
        <BrowserRouter>
          <VideoFileForm />
        </BrowserRouter>
      );

      expect(screen.getByText('Upload Successful')).toBeInTheDocument();
      expect(screen.getByText('Video file has been uploaded successfully!')).toBeInTheDocument();
    });

    it('should show error message when upload fails', () => {
      mockVideoUpload.state.error = 'Upload failed: Invalid file format';

      render(
        <BrowserRouter>
          <VideoFileForm />
        </BrowserRouter>
      );

      expect(screen.getByText('Upload Error')).toBeInTheDocument();
      expect(screen.getByText('Upload failed: Invalid file format')).toBeInTheDocument();
    });

    it('should show test playback button when upload completes', () => {
      mockVideoUpload.state.videoFile = {
        id: 'test-video-id',
        file_name: 'test.mp4',
        encoding_status: 'pending',
        upload_method: 'new_upload' as const,
        upload_status: 'upload_completed' as const,
        creation_date_utc: '2024-01-15T10:30:00Z',
      };
      mockVideoUpload.state.progress = {
        stage: 'completed' as const,
        progress: 100,
        message: 'Upload successful',
        videoFileId: 'test-video-id',
      };

      render(
        <BrowserRouter>
          <VideoFileForm />
        </BrowserRouter>
      );

      expect(screen.getByText('Test Video Playback')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Test Video Playback/i })).toBeInTheDocument();
    });

    it('should call test playback when test button is clicked', async () => {
      mockVideoUpload.state.videoFile = {
        id: 'test-video-id',
        file_name: 'test.mp4',
        encoding_status: 'pending',
        upload_method: 'new_upload' as const,
        upload_status: 'upload_completed' as const,
        creation_date_utc: '2024-01-15T10:30:00Z',
      };
      mockVideoUpload.state.progress = {
        stage: 'completed' as const,
        progress: 100,
        message: 'Upload successful',
        videoFileId: 'test-video-id',
      };

      render(
        <BrowserRouter>
          <VideoFileForm />
        </BrowserRouter>
      );

      const testButton = screen.getByRole('button', { name: /Test Video Playback/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockVideoPlayback.testPlayback).toHaveBeenCalledWith('test-video-id');
      });
    });
  });

  describe('VideoFileDetailPage Component', () => {
    const mockVideoPlayback = {
      state: {
        isLoading: false,
        result: null,
        error: null,
      },
      testPlayback: vi.fn(),
      reset: vi.fn(),
    };

    beforeEach(() => {
      const { useVideoPlayback } = require('share');
      useVideoPlayback.mockReturnValue(mockVideoPlayback);
    });

    it('should render video file details', () => {
      render(
        <BrowserRouter>
          <VideoFileDetailPage />
        </BrowserRouter>
      );

      expect(screen.getByText('sample_video.mp4')).toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      expect(screen.getByText('Test Playback')).toBeInTheDocument();
    });

    it('should show test playback button', () => {
      render(
        <BrowserRouter>
          <VideoFileDetailPage />
        </BrowserRouter>
      );

      expect(screen.getByRole('button', { name: /Test Video Playback/i })).toBeInTheDocument();
    });

    it('should call test playback when button is clicked', async () => {
      render(
        <BrowserRouter>
          <VideoFileDetailPage />
        </BrowserRouter>
      );

      const testButton = screen.getByRole('button', { name: /Test Video Playback/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockVideoPlayback.testPlayback).toHaveBeenCalled();
      });
    });

    it('should show successful playback result', () => {
      mockVideoPlayback.state.result = {
        success: true,
        playbackUrl: 'https://stream.mux.com/test123.m3u8',
        muxPlaybackId: 'test123',
      };

      render(
        <BrowserRouter>
          <VideoFileDetailPage />
        </BrowserRouter>
      );

      expect(screen.getByText('Playback Available')).toBeInTheDocument();
      expect(screen.getByText('Open in new tab')).toBeInTheDocument();
    });

    it('should show failed playback result', () => {
      mockVideoPlayback.state.result = {
        success: false,
        errorMessage: 'Video file not found',
      };

      render(
        <BrowserRouter>
          <VideoFileDetailPage />
        </BrowserRouter>
      );

      expect(screen.getByText('Playback Failed')).toBeInTheDocument();
      expect(screen.getByText('Video file not found')).toBeInTheDocument();
    });
  });

  describe('VideoFileListPage Component', () => {
    it('should render video files list', () => {
      render(
        <BrowserRouter>
          <VideoFileListPage />
        </BrowserRouter>
      );

      expect(screen.getByText('Video Files')).toBeInTheDocument();
      expect(screen.getByText('Manage video file uploads and media assets')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Video File/i })).toBeInTheDocument();
    });

    it('should show table headers', () => {
      render(
        <BrowserRouter>
          <VideoFileListPage />
        </BrowserRouter>
      );

      expect(screen.getByText('File Name')).toBeInTheDocument();
      expect(screen.getByText('Upload Method')).toBeInTheDocument();
      expect(screen.getByText('Upload Status')).toBeInTheDocument();
      expect(screen.getByText('Encoding Status')).toBeInTheDocument();
      expect(screen.getByText('File Size')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });
});