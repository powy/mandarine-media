import React, { useState } from 'react';
import { useUploaderTasks, useCancelAllTasks } from '../hooks/useUploaderTasks';
import { TaskItem } from './TaskItem';
import type { TaskStatus } from '../types/uploader';

const STATUS_FILTERS: { value: string; label: string; count?: number }[] = [
  { value: 'all', label: 'All Tasks' },
  { value: 'running', label: 'Running' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const TaskMonitor: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [limit, setLimit] = useState(1000);

  const { data, isLoading, error, refetch } = useUploaderTasks({
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit,
  });

  const cancelAllTasks = useCancelAllTasks();

  // Handle the data structure correctly - data is Task[] directly, not wrapped
  const tasks = Array.isArray(data) ? data : [];
  const totalTasks = tasks.length;

  // Calculate statistics
  const stats = tasks.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const runningCount = stats.running || 0;
  const pendingCount = stats.pending || 0;
  const hasActiveTasks = runningCount > 0 || pendingCount > 0;

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <span className="mr-2">📊</span>
            Task Monitor
            {isLoading && <span className="ml-2 animate-spin">⚡</span>}
          </h2>

          <div className="flex items-center space-x-3">
            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              🔄 Refresh
            </button>

            {/* Cancel All Button */}
            {hasActiveTasks && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to cancel all running and pending tasks?')) {
                    cancelAllTasks.cancelAllTasks();
                  }
                }}
                disabled={cancelAllTasks.isLoading}
                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {cancelAllTasks.isLoading ? '⏳' : '🛑'} Cancel All
              </button>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.running || 0}</div>
            <div className="text-sm text-gray-500">Running</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed || 0}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failed || 0}</div>
            <div className="text-sm text-gray-500">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.cancelled || 0}</div>
            <div className="text-sm text-gray-500">Cancelled</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`
                inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${statusFilter === filter.value
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {filter.label}
              {filter.value !== 'all' && stats[filter.value] ? (
                <span className="ml-1 bg-white bg-opacity-75 px-1.5 py-0.5 rounded-full text-xs">
                  {stats[filter.value]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin text-3xl">⚡</div>
            <span className="ml-2 text-gray-600">Loading tasks...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-2">❌</span>
              <div>
                <h3 className="text-red-800 font-medium">Failed to load tasks</h3>
                <p className="text-red-700 text-sm mt-1">
                  {error instanceof Error ? error.message : 'Unknown error occurred'}
                </p>
                <button
                  onClick={() => refetch()}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && tasks.length === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-500">
              {statusFilter === 'all'
                ? 'No tasks have been created yet. Start by running a command above.'
                : `No ${statusFilter} tasks found. Try changing the filter or running more commands.`}
            </p>
          </div>
        )}

        {/* Task List */}
        {!isLoading && !error && tasks.length > 0 && (
          <div className="space-y-4">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}

            {/* Load More Button */}
            {tasks.length < totalTasks && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setLimit(limit + 100)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Load More ({tasks.length} of {totalTasks})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};