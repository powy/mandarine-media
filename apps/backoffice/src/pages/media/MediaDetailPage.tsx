import { useParams, useNavigate } from 'react-router-dom';
import { PencilIcon, TrashIcon, StarIcon, EyeIcon, ShareIcon } from '@heroicons/react/24/outline';
import { useMediaDetail, useDeleteMedia, useLikeMedia, useShareMedia } from '@/hooks/useMediaData';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common';
import { formatDate, formatNumber, formatDuration } from '@/utils/formatters';
import { useState } from 'react';

export const MediaDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: media, isLoading } = useMediaDetail(id);
  const deleteMediaMutation = useDeleteMedia();
  const likeMutation = useLikeMedia();
  const shareMutation = useShareMedia();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Media not found</h3>
        <p className="text-gray-500">The requested media description could not be found.</p>
        <button
          onClick={() => navigate('/media')}
          className="mt-4 btn btn-primary"
        >
          Back to Media List
        </button>
      </div>
    );
  }

  const handleEdit = () => {
    navigate(`/media/${id}/edit`);
  };

  const handleDelete = async () => {
    if (id) {
      await deleteMediaMutation.mutateAsync(id);
      navigate('/media');
    }
  };

  const handleLike = () => {
    if (id) {
      likeMutation.mutate(id);
    }
  };

  const handleShare = () => {
    if (id) {
      shareMutation.mutate(id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => navigate('/media')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            ← Back to Media List
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{media.episode_title}</h1>
          <p className="text-gray-500">#{media.file_number}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleEdit}
            className="btn btn-secondary flex items-center"
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Edit
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="btn btn-danger flex items-center"
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{media.media_type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={media.content_status || 'draft'} />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Episode</dt>
                <dd className="mt-1 text-sm text-gray-900">{media.episode_number || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Duration</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {media.duration_seconds ? formatDuration(media.duration_seconds) : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Language</dt>
                <dd className="mt-1 text-sm text-gray-900">{media.language || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Production Year</dt>
                <dd className="mt-1 text-sm text-gray-900">{media.production_year || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Content Rating</dt>
                <dd className="mt-1 text-sm text-gray-900">{media.content_rating || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(media.creation_date_utc)}</dd>
              </div>
            </dl>
          </div>

          {/* Description */}
          {media.descriptive_summary_text && (
            <div className="card p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700">{media.descriptive_summary_text}</p>
            </div>
          )}

          {/* Synopsis */}
          {media.synopsis_text && (
            <div className="card p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Synopsis</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{media.synopsis_text}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Thumbnail */}
          {media.main_thumbnail_url && (
            <div className="card p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Thumbnail</h3>
              <img
                src={media.main_thumbnail_url}
                alt={media.episode_title}
                className="w-full rounded-lg"
              />
            </div>
          )}

          {/* Stats */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Views</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatNumber(media.view_count || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Likes</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatNumber(media.like_count || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Shares</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatNumber(media.share_count || 0)}
                </span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <button
                  onClick={handleLike}
                  disabled={likeMutation.isPending}
                  className="flex-1 btn btn-secondary text-xs flex items-center justify-center"
                >
                  <EyeIcon className="w-3 h-3 mr-1" />
                  Like
                </button>
                <button
                  onClick={handleShare}
                  disabled={shareMutation.isPending}
                  className="flex-1 btn btn-secondary text-xs flex items-center justify-center"
                >
                  <ShareIcon className="w-3 h-3 mr-1" />
                  Share
                </button>
              </div>
            </div>
          </div>

          {/* Flags */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Flags</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Featured</span>
                {media.is_featured ? (
                  <StarIcon className="w-4 h-4 text-yellow-500" />
                ) : (
                  <span className="text-sm text-gray-400">No</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Premium</span>
                <span className="text-sm text-gray-900">
                  {media.is_premium ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Media Description"
        message={`Are you sure you want to delete "${media.episode_title}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
        loading={deleteMediaMutation.isPending}
      />
    </div>
  );
};