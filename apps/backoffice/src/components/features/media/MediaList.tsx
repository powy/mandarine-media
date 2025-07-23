import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { PencilIcon, TrashIcon, EyeIcon, StarIcon } from '@heroicons/react/24/outline';
import { MediaDescription, MediaFilters } from 'share';
import { DataTable, PageHeader, ConfirmDialog } from '@/components/common';
import { MediaFiltersComponent } from './MediaFilters';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useMediaList, useDeleteMedia } from '@/hooks/useMediaData';
import { formatDate, formatNumber } from '@/utils/formatters';
import clsx from 'clsx';

export const MediaList = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<MediaFilters>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: mediaResponse, isLoading } = useMediaList(filters);
  const deleteMediaMutation = useDeleteMedia();

  const mediaList = mediaResponse?.data || [];

  const columns = useMemo<ColumnDef<MediaDescription>[]>(() => [
    {
      id: 'thumbnail',
      header: '',
      cell: ({ row }) => (
        <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
          {row.original.main_thumbnail_url ? (
            <img
              src={row.original.main_thumbnail_url}
              alt={row.original.episode_title}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <span className="text-gray-400 text-xs">No image</span>
          )}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'episode_title',
      header: 'Title',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900">{row.original.episode_title}</div>
          <div className="text-sm text-gray-500">#{row.original.file_number}</div>
        </div>
      ),
    },
    {
      accessorKey: 'media_type',
      header: 'Type',
      cell: ({ getValue }) => (
        <span className="capitalize text-sm text-gray-700">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'content_status',
      header: 'Status',
      cell: ({ getValue }) => (
        <StatusBadge status={getValue<string>()} />
      ),
    },
    {
      id: 'featured',
      header: 'Featured',
      cell: ({ row }) => (
        row.original.is_featured ? (
          <StarIcon className="w-5 h-5 text-yellow-500" />
        ) : (
          <div className="w-5 h-5"></div>
        )
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'view_count',
      header: 'Views',
      cell: ({ getValue }) => formatNumber(getValue<number>()),
    },
    {
      accessorKey: 'creation_date_utc',
      header: 'Created',
      cell: ({ getValue }) => formatDate(getValue<string>()),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/media/${row.original.id}`);
            }}
            className="p-1 text-gray-400 hover:text-blue-600"
            title="View"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/media/${row.original.id}/edit`);
            }}
            className="p-1 text-gray-400 hover:text-green-600"
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(row.original.id);
            }}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ),
      enableSorting: false,
    },
  ], [navigate]);

  const handleCreateNew = () => {
    navigate('/media/create');
  };

  const handleRowClick = (media: MediaDescription) => {
    navigate(`/media/${media.id}`);
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMediaMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Media Descriptions"
        subtitle={`${mediaList.length} content items`}
        onCreateNew={handleCreateNew}
        createNewText="Add Media Content"
      />

      <MediaFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleResetFilters}
      />

      <DataTable
        data={mediaList}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Search media content..."
        onRowClick={handleRowClick}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Media Description"
        message="Are you sure you want to delete this media description? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        loading={deleteMediaMutation.isPending}
      />
    </div>
  );
};