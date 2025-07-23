import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoFile } from 'share';
import { PageHeader, DataTable, StatusBadge } from '@/components/common';
import { formatFileSize, formatDuration } from 'share';

// Mock hook for video files - should be replaced with actual API hook
const useVideoFiles = () => {
  // This would normally fetch from the API
  return {
    data: { data: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } },
    isLoading: false,
    error: null,
  };
};

export const VideoFileListPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    skip: 0,
    limit: 20,
  });

  const { data, isLoading, error } = useVideoFiles();

  const handleCreate = () => {
    navigate('/video-files/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/video-files/${id}/edit`);
  };

  const handleView = (id: string) => {
    navigate(`/video-files/${id}`);
  };

  const columns = [
    {
      key: 'file_name',
      header: 'File Name',
      render: (videoFile: VideoFile) => (
        <div>
          <div className="font-medium text-gray-900">{videoFile.file_name}</div>
          <div className="text-sm text-gray-500">ID: {videoFile.id.slice(0, 8)}...</div>
        </div>
      ),
    },
    {
      key: 'upload_method',
      header: 'Upload Method',
      render: (videoFile: VideoFile) => (
        <StatusBadge
          status={videoFile.upload_method}
          variant={videoFile.upload_method === 'new_upload' ? 'blue' : 'green'}
        />
      ),
    },
    {
      key: 'upload_status',
      header: 'Upload Status',
      render: (videoFile: VideoFile) => {
        const getVariant = (status: string) => {
          switch (status) {
            case 'upload_completed': return 'success';
            case 'metadata_only': return 'warning';
            case 'file_uploading': return 'info';
            case 'upload_failed': return 'error';
            default: return 'default';
          }
        };
        
        return (
          <StatusBadge
            status={videoFile.upload_status}
            variant={getVariant(videoFile.upload_status)}
          />
        );
      },
    },
    {
      key: 'encoding_status',
      header: 'Encoding Status',
      render: (videoFile: VideoFile) => {
        const getVariant = (status: string) => {
          switch (status) {
            case 'completed': return 'success';
            case 'processing': return 'info';
            case 'failed': return 'error';
            default: return 'warning';
          }
        };
        
        return (
          <StatusBadge
            status={videoFile.encoding_status}
            variant={getVariant(videoFile.encoding_status)}
          />
        );
      },
    },
    {
      key: 'file_size',
      header: 'File Size',
      render: (videoFile: VideoFile) => 
        videoFile.file_size_bytes ? formatFileSize(videoFile.file_size_bytes) : 'N/A',
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (videoFile: VideoFile) => 
        videoFile.duration_seconds ? formatDuration(videoFile.duration_seconds) : 'N/A',
    },
    {
      key: 'creation_date',
      header: 'Created',
      render: (videoFile: VideoFile) => 
        new Date(videoFile.creation_date_utc).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (videoFile: VideoFile) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleView(videoFile.id)}
            className="text-blue-600 hover:text-blue-900 text-sm"
          >
            View
          </button>
          <button
            onClick={() => handleEdit(videoFile.id)}
            className="text-indigo-600 hover:text-indigo-900 text-sm"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">Error loading video files</h2>
          <p className="text-gray-500">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Video Files"
        subtitle="Manage video file uploads and media assets"
        action={{
          label: 'Add Video File',
          onClick: handleCreate,
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <DataTable
            data={data?.data || []}
            columns={columns}
            loading={isLoading}
            pagination={data?.pagination}
            onPageChange={(page) => setFilters(prev => ({ ...prev, skip: (page - 1) * prev.limit }))}
          />
        </div>
      </div>
    </div>
  );
};