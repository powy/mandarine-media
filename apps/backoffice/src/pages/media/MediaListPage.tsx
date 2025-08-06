import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { MediaDescription, MediaFilters } from 'share';
import { DataTable } from '../../components/common/DataTable';
import { PageHeader } from '../../components/common/PageHeader';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useMediaList, useDeleteMedia } from '../../hooks/useMediaData';
import { formatDate } from '../../utils/formatters';

export const MediaListPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<MediaFilters>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: mediaResponse, isLoading, error } = useMediaList(filters);
  const deleteMediaMutation = useDeleteMedia();

  const mediaList = mediaResponse?.data || [];

  const columns = useMemo<ColumnDef<MediaDescription>[]>(() => [
    {
      id: 'file_number',
      header: 'File #',
      accessorKey: 'file_number',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.file_number || 'N/A'}
        </span>
      ),
    },
    {
      id: 'episode_title',
      header: 'Title',
      accessorKey: 'episode_title',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.episode_title}</div>
          {row.original.file_name && (
            <div className="text-sm text-gray-500">{row.original.file_name}</div>
          )}
        </div>
      ),
    },
    {
      id: 'media_type',
      header: 'Type',
      accessorKey: 'media_type',
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.media_type}
          variant={row.original.media_type === 'video' ? 'success' : 'info'}
        />
      ),
    },
    {
      id: 'creation_date_utc',
      header: 'Created',
      accessorKey: 'creation_date_utc',
      cell: ({ row }) => formatDate(row.original.creation_date_utc),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/media/${row.original.id}`)}
            className="text-blue-600 hover:text-blue-900"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(`/media/${row.original.id}/edit`)}
            className="text-green-600 hover:text-green-900"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteId(row.original.id)}
            className="text-red-600 hover:text-red-900"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ], [navigate]);

  const handleDelete = () => {
    if (deleteId) {
      deleteMediaMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Media Descriptions</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">Failed to load media descriptions. Please check the API connection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Media Descriptions"
        subtitle="Manage media content descriptions and metadata"
        action={{
          label: 'Add Media Description',
          onClick: () => navigate('/media/new')
        }}
      />

      <DataTable
        data={mediaList}
        columns={columns}
        loading={isLoading}
        pagination={{
          currentPage: 1,
          totalPages: 1,
          pageSize: 50,
          totalItems: mediaList.length,
          hasNext: false,
          hasPrev: false,
        }}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Media Description"
        message="Are you sure you want to delete this media description? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};