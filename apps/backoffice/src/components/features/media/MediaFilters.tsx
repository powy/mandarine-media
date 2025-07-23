import { useState } from 'react';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MediaFilters } from 'share';
import { MEDIA_TYPES, CONTENT_STATUS_OPTIONS } from '@/utils/constants';
import clsx from 'clsx';

interface MediaFiltersProps {
  filters: MediaFilters;
  onFiltersChange: (filters: MediaFilters) => void;
  onReset: () => void;
}

export const MediaFiltersComponent = ({ filters, onFiltersChange, onReset }: MediaFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof MediaFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== null
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-6">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <FunnelIcon className="w-4 h-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                Active
              </span>
            )}
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Media Type Filter */}
            <div>
              <label className="form-label">Media Type</label>
              <select
                value={filters.media_type || ''}
                onChange={(e) => updateFilter('media_type', e.target.value || undefined)}
                className="form-input"
              >
                <option value="">All Types</option>
                {MEDIA_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="form-label">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => updateFilter('status', e.target.value || undefined)}
                className="form-input"
              >
                <option value="">All Statuses</option>
                {CONTENT_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Featured Filter */}
            <div>
              <label className="form-label">Featured</label>
              <select
                value={filters.is_featured === undefined ? '' : filters.is_featured.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  updateFilter('is_featured', value === '' ? undefined : value === 'true');
                }}
                className="form-input"
              >
                <option value="">All</option>
                <option value="true">Featured</option>
                <option value="false">Not Featured</option>
              </select>
            </div>

            {/* Premium Filter */}
            <div>
              <label className="form-label">Premium</label>
              <select
                value={filters.is_premium === undefined ? '' : filters.is_premium.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  updateFilter('is_premium', value === '' ? undefined : value === 'true');
                }}
                className="form-input"
              >
                <option value="">All</option>
                <option value="true">Premium</option>
                <option value="false">Free</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFiltersChange({ is_featured: true })}
                className={clsx(
                  'px-3 py-1 rounded-full text-sm border',
                  filters.is_featured === true
                    ? 'bg-primary-100 border-primary-200 text-primary-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                )}
              >
                Featured Content
              </button>
              <button
                onClick={() => onFiltersChange({ status: 'published' })}
                className={clsx(
                  'px-3 py-1 rounded-full text-sm border',
                  filters.status === 'published'
                    ? 'bg-green-100 border-green-200 text-green-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                )}
              >
                Published
              </button>
              <button
                onClick={() => onFiltersChange({ status: 'draft' })}
                className={clsx(
                  'px-3 py-1 rounded-full text-sm border',
                  filters.status === 'draft'
                    ? 'bg-yellow-100 border-yellow-200 text-yellow-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                )}
              >
                Drafts
              </button>
              <button
                onClick={() => onFiltersChange({ media_type: 'video' })}
                className={clsx(
                  'px-3 py-1 rounded-full text-sm border',
                  filters.media_type === 'video'
                    ? 'bg-blue-100 border-blue-200 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                )}
              >
                Videos Only
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};