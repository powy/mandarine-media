import React, { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useDescriptionReports } from 'share';
import { DataTable, PageHeader, StatusBadge } from '@/components/common';
import { DescriptionReport } from 'share';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircleIcon, XCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { BulkDescriptionUpload } from './BulkDescriptionUpload';

export const DescriptionReportsList: React.FC = () => {
  const [showUpload, setShowUpload] = useState(false);
  const { reports, loading, error, pagination, loadPage, refresh } = useDescriptionReports({
    limit: 20,
    autoRefresh: true,
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  const columns = useMemo<ColumnDef<DescriptionReport>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Description Title',
      cell: ({ row }) => (
        <div className="font-medium text-gray-900">
          {row.getValue('title')}
        </div>
      ),
    },
    {
      accessorKey: 'description_id',
      header: 'Description ID',
      cell: ({ row }) => (
        <div className="font-mono text-sm text-gray-600">
          {String(row.getValue('description_id')).slice(0, 8)}...
        </div>
      ),
    },
    {
      accessorKey: 'success_associated_file',
      header: 'File Association',
      cell: ({ row }) => {
        const success = row.getValue('success_associated_file') as boolean;
        return (
          <div className="flex items-center">
            {success ? (
              <>
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-green-700">Success</span>
              </>
            ) : (
              <>
                <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">Failed</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'batch_id',
      header: 'Batch ID',
      cell: ({ row }) => {
        const batchId = row.getValue('batch_id') as string | null;
        return batchId ? (
          <div className="font-mono text-xs text-gray-500">
            {batchId.slice(0, 8)}...
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: 'timestamp',
      header: 'Created',
      cell: ({ row }) => {
        const timestamp = row.getValue('timestamp') as string;
        const date = new Date(timestamp);
        return (
          <div className="text-sm">
            <div className="text-gray-900">
              {date.toLocaleDateString()}
            </div>
            <div className="text-gray-500">
              {formatDistanceToNow(date, { addSuffix: true })}
            </div>
          </div>
        );
      },
    },
  ], []);

  const handlePageChange = (page: number) => {
    loadPage(page);
  };

  const handleUploadComplete = (result: any) => {
    setShowUpload(false);
    refresh(); // Refresh the reports list to show new reports
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader 
          title="Description Reports" 
          description="Track the status of media description creation operations"
        />
        <div className="px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <XCircleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading reports
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="Description Reports" 
        description="Track the status of media description creation operations"
      />
      
      <div className="px-4 py-8 space-y-6">
        {/* Upload Interface */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Bulk Upload
              </h2>
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                {showUpload ? 'Hide Upload' : 'Upload Excel'}
              </button>
            </div>
          </div>
          
          {showUpload && (
            <div className="p-6">
              <BulkDescriptionUpload onUploadComplete={handleUploadComplete} />
            </div>
          )}
        </div>

        {/* Reports List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Reports History
              </h2>
              {pagination && (
                <div className="text-sm text-gray-500">
                  {pagination.total} total reports
                </div>
              )}
            </div>
          </div>
          
          <DataTable
            data={reports}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search reports..."
          />
          
          {pagination && pagination.total_pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {pagination.page} of {pagination.total_pages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.total_pages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};