import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { videoFileReportsApi, VideoFileReport, VideoFileReportParams } from 'share';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';

const VideoFileReportsPage: React.FC = () => {
  const [reports, setReports] = useState<VideoFileReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 20,
    total: 0,
    has_next: false,
    has_prev: false,
  });
  const [eventFilter, setEventFilter] = useState<string>('');

  const fetchReports = async (params: VideoFileReportParams = {}) => {
    try {
      setLoading(true);
      const response = await videoFileReportsApi.getReports({
        skip: params.skip || 0,
        limit: params.limit || 20,
        event: params.event || undefined,
      });
      setReports(response.data);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError('Failed to load video file reports');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports({ skip: pagination.skip, limit: pagination.limit, event: eventFilter });
  }, []);

  const handlePageChange = (newSkip: number) => {
    setPagination(prev => ({ ...prev, skip: newSkip }));
    fetchReports({ skip: newSkip, limit: pagination.limit, event: eventFilter });
  };

  const handleEventFilterChange = (event: string) => {
    setEventFilter(event);
    setPagination(prev => ({ ...prev, skip: 0 }));
    fetchReports({ skip: 0, limit: pagination.limit, event });
  };

  const getEventBadgeColor = (event: string) => {
    switch (event) {
      case 'possible_orphan':
        return 'yellow';
      case 'file_delete':
        return 'red';
      default:
        return 'blue';
    }
  };

  const columns = [
    {
      header: 'Event',
      accessorKey: 'event',
      cell: ({ row }: any) => (
        <StatusBadge
          status={row.original.event}
          color={getEventBadgeColor(row.original.event)}
          text={row.original.event.replace('_', ' ').toUpperCase()}
        />
      ),
    },
    {
      header: 'Video File',
      accessorKey: 'video_file_name',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.original.video_file_name}
          </div>
          {row.original.video_file_url && (
            <div className="text-sm text-gray-500 truncate max-w-xs">
              {row.original.video_file_url}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Media Description',
      accessorKey: 'media_description_title',
      cell: ({ row }: any) => (
        <div>
          {row.original.media_description_title ? (
            <div className="text-sm text-gray-900">
              {row.original.media_description_title}
            </div>
          ) : (
            <span className="text-sm text-gray-400 italic">No media description</span>
          )}
        </div>
      ),
    },
    {
      header: 'File Info',
      accessorKey: 'file_size',
      cell: ({ row }: any) => (
        <div className="text-sm text-gray-600">
          {row.original.file_size && (
            <div>Size: {row.original.file_size}</div>
          )}
          {row.original.duration && (
            <div>Duration: {row.original.duration}</div>
          )}
          {row.original.upload_method && (
            <div>Method: {row.original.upload_method}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      cell: ({ row }: any) => (
        <div className="text-sm text-gray-900">
          {format(new Date(row.original.timestamp), 'MMM dd, yyyy HH:mm')}
        </div>
      ),
    },
    {
      header: 'Additional Info',
      accessorKey: 'additional_info',
      cell: ({ row }: any) => (
        <div className="text-sm text-gray-600 max-w-xs truncate">
          {row.original.additional_info || '-'}
        </div>
      ),
    },
  ];

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Video File Reports"
        description="Track video file operations and orphaned files"
      />

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="event-filter" className="block text-sm font-medium text-gray-700">
              Filter by Event
            </label>
            <select
              id="event-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={eventFilter}
              onChange={(e) => handleEventFilterChange(e.target.value)}
            >
              <option value="">All Events</option>
              <option value="possible_orphan">Possible Orphans</option>
              <option value="file_delete">File Deletions</option>
            </select>
          </div>
          <div className="flex-1" />
          <div className="text-sm text-gray-600">
            Total: {pagination.total} reports
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-white shadow rounded-lg">
        <DataTable
          data={reports}
          columns={columns}
          loading={loading}
          pagination={{
            currentPage: Math.floor(pagination.skip / pagination.limit) + 1,
            totalPages: Math.ceil(pagination.total / pagination.limit),
            pageSize: pagination.limit,
            totalItems: pagination.total,
            hasNext: pagination.has_next,
            hasPrev: pagination.has_prev,
          }}
          onPageChange={(page) => {
            const newSkip = (page - 1) * pagination.limit;
            handlePageChange(newSkip);
          }}
        />
      </div>

      {reports.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            {eventFilter ? `No ${eventFilter.replace('_', ' ')} reports found` : 'No reports found'}
          </div>
          <div className="text-gray-400 text-sm mt-2">
            Reports will appear here when video files are deleted or destroyed
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoFileReportsPage;