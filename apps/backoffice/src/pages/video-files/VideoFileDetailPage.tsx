import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoFile, useVideoPlayback } from 'share';
import { PageHeader, StatusBadge } from '@/components/common';
import { formatFileSize, formatDuration } from 'share';
import clsx from 'clsx';

// Mock hook for video file detail - should be replaced with actual API hook
const useVideoFileDetail = (id: string) => {
  // This would normally fetch from the API
  const mockVideoFile: VideoFile = {
    id: id || 'mock-id',
    file_name: 'sample_video.mp4',
    encoding_status: 'completed',
    upload_method: 'new_upload',
    upload_status: 'upload_completed',
    creation_date_utc: '2024-01-15T10:30:00Z',
    file_url: 'https://example.com/videos/sample.mp4',
    file_size_bytes: 52428800, // 50MB
    duration_seconds: 3600, // 1 hour
    video_codec: 'H.264',
    audio_codec: 'AAC',
    file_format: 'MP4',
    resolution_width: 1920,
    resolution_height: 1080,
    frame_rate: 30,
    bitrate_kbps: 5000,
    mux_playback_id: 'abc123',
  };

  return {
    data: mockVideoFile,
    isLoading: false,
    error: null,
  };
};

export const VideoFileDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showMuxPlayer, setShowMuxPlayer] = useState(false);
  
  const { data: videoFile, isLoading, error } = useVideoFileDetail(id!);
  const videoPlayback = useVideoPlayback();

  const handleEdit = () => {
    navigate(`/video-files/${id}/edit`);
  };

  const handleTestPlayback = async () => {
    if (videoFile?.id) {
      await videoPlayback.testPlayback(videoFile.id);
      if (videoPlayback.state.result?.success) {
        setShowMuxPlayer(true);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !videoFile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">Video file not found</h2>
          <p className="text-gray-500">The requested video file could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={videoFile.file_name}
        subtitle={`Video File Details - ${videoFile.id.slice(0, 8)}...`}
        action={{
          label: 'Edit',
          onClick: handleEdit,
        }}
        backPath="/video-files"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">File Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{videoFile.file_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">File ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{videoFile.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Upload Method</dt>
                  <dd className="mt-1">
                    <StatusBadge
                      status={videoFile.upload_method}
                      variant={videoFile.upload_method === 'new_upload' ? 'blue' : 'green'}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Upload Status</dt>
                  <dd className="mt-1">
                    <StatusBadge
                      status={videoFile.upload_status}
                      variant={
                        videoFile.upload_status === 'upload_completed' ? 'success' :
                        videoFile.upload_status === 'upload_failed' ? 'error' :
                        videoFile.upload_status === 'file_uploading' ? 'info' : 'warning'
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Encoding Status</dt>
                  <dd className="mt-1">
                    <StatusBadge
                      status={videoFile.encoding_status}
                      variant={
                        videoFile.encoding_status === 'completed' ? 'success' :
                        videoFile.encoding_status === 'failed' ? 'error' :
                        videoFile.encoding_status === 'processing' ? 'info' : 'warning'
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(videoFile.creation_date_utc).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Technical Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Details</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">File Size</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {videoFile.file_size_bytes ? formatFileSize(videoFile.file_size_bytes) : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Duration</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {videoFile.duration_seconds ? formatDuration(videoFile.duration_seconds) : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Video Codec</dt>
                  <dd className="mt-1 text-sm text-gray-900">{videoFile.video_codec || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Audio Codec</dt>
                  <dd className="mt-1 text-sm text-gray-900">{videoFile.audio_codec || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Format</dt>
                  <dd className="mt-1 text-sm text-gray-900">{videoFile.file_format || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Resolution</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {videoFile.resolution_width && videoFile.resolution_height
                      ? `${videoFile.resolution_width}x${videoFile.resolution_height}`
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Frame Rate</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {videoFile.frame_rate ? `${videoFile.frame_rate} fps` : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Bitrate</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {videoFile.bitrate_kbps ? `${videoFile.bitrate_kbps} kbps` : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* URLs and References */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">URLs and References</h3>
              <dl className="space-y-4">
                {videoFile.file_url && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">File URL</dt>
                    <dd className="mt-1 text-sm text-gray-900 break-all">
                      <a href={videoFile.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        {videoFile.file_url}
                      </a>
                    </dd>
                  </div>
                )}
                {videoFile.external_url && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">External URL</dt>
                    <dd className="mt-1 text-sm text-gray-900 break-all">
                      <a href={videoFile.external_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        {videoFile.external_url}
                      </a>
                    </dd>
                  </div>
                )}
                {videoFile.mux_playback_id && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Mux Playback ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{videoFile.mux_playback_id}</dd>
                  </div>
                )}
                {videoFile.mux_asset_id && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Mux Asset ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{videoFile.mux_asset_id}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Test Playback */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Test Playback</h3>
              <div className="space-y-4">
                <button
                  onClick={handleTestPlayback}
                  disabled={videoPlayback.state.isLoading}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {videoPlayback.state.isLoading ? 'Testing...' : 'Test Video Playback'}
                </button>

                {/* Test Results */}
                {videoPlayback.state.result && (
                  <div className={clsx(
                    'border rounded-md p-4',
                    videoPlayback.state.result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  )}>
                    <h4 className={clsx(
                      'text-sm font-medium',
                      videoPlayback.state.result.success ? 'text-green-800' : 'text-red-800'
                    )}>
                      {videoPlayback.state.result.success ? 'Playback Available' : 'Playback Failed'}
                    </h4>
                    {videoPlayback.state.result.success && videoPlayback.state.result.playbackUrl && (
                      <div className="mt-2 text-sm text-green-700">
                        <p className="break-all">
                          <a href={videoPlayback.state.result.playbackUrl} target="_blank" rel="noopener noreferrer" className="underline">
                            Open in new tab
                          </a>
                        </p>
                      </div>
                    )}
                    {!videoPlayback.state.result.success && videoPlayback.state.result.errorMessage && (
                      <div className="mt-2 text-sm text-red-700">
                        <p>{videoPlayback.state.result.errorMessage}</p>
                      </div>
                    )}
                  </div>
                )}

                {videoPlayback.state.error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-700">Test failed: {videoPlayback.state.error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mux Video Player */}
            {showMuxPlayer && videoPlayback.state.result?.success && videoPlayback.state.result.playbackUrl && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Video Player</h3>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    controls
                    className="w-full h-full"
                    src={videoPlayback.state.result.playbackUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Note: This is a basic HTML5 video player. For production, consider using Mux Player.
                </div>
              </div>
            )}

            {/* Status Summary */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Upload Complete</span>
                  <span className={clsx(
                    'text-sm font-medium',
                    videoFile.upload_status === 'upload_completed' ? 'text-green-600' : 'text-red-600'
                  )}>
                    {videoFile.upload_status === 'upload_completed' ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Encoding Complete</span>
                  <span className={clsx(
                    'text-sm font-medium',
                    videoFile.encoding_status === 'completed' ? 'text-green-600' : 'text-red-600'
                  )}>
                    {videoFile.encoding_status === 'completed' ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Playback Ready</span>
                  <span className={clsx(
                    'text-sm font-medium',
                    (videoFile.file_url || videoFile.external_url || videoFile.mux_playback_id) ? 'text-green-600' : 'text-red-600'
                  )}>
                    {(videoFile.file_url || videoFile.external_url || videoFile.mux_playback_id) ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};