import React, { useState } from 'react';
import { useCancelTask } from '../hooks/useUploaderTasks';
import type { Task } from '../types/uploader';

interface TaskItemProps {
  task: Task;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return '⏳';
    case 'running': return '🔄';
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'cancelled': return '⚠️';
    default: return '❓';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'text-yellow-600 bg-yellow-50';
    case 'running': return 'text-blue-600 bg-blue-50';
    case 'completed': return 'text-green-600 bg-green-50';
    case 'failed': return 'text-red-600 bg-red-50';
    case 'cancelled': return 'text-orange-600 bg-orange-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

const formatDuration = (startDate?: string, endDate?: string) => {
  if (!startDate) return 'N/A';

  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  const duration = end - start;

  if (duration < 1000) return '<1s';
  if (duration < 60000) return `${Math.floor(duration / 1000)}s`;
  if (duration < 3600000) return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
  return `${Math.floor(duration / 3600000)}h ${Math.floor((duration % 3600000) / 60000)}m`;
};

export const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const cancelTask = useCancelTask();

  const handleCancel = () => {
    if (task.status === 'running' || task.status === 'pending') {
      cancelTask.mutate(task.id);
    }
  };

  const canCancel = task.status === 'running' || task.status === 'pending';

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Task Header - Always Visible */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">{getStatusIcon(task.status)}</span>
            <div>
              <div className="font-medium text-gray-900">{task.type}</div>
              <div className="text-sm text-gray-500">ID: {task.id.slice(0, 8)}...</div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Status Badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
              {task.status.toUpperCase()}
            </span>

            {/* Progress Bar (if running) */}
            {task.status === 'running' && typeof task.progress === 'number' && (
              <div className="w-24">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">{task.progress}%</div>
              </div>
            )}

            {/* Cancel Button */}
            {canCancel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                disabled={cancelTask.isPending}
                className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                {cancelTask.isPending ? '⏳' : '🛑'} Cancel
              </button>
            )}

            {/* Expand/Collapse Icon */}
            <span className="text-gray-400 transform transition-transform duration-200">
              {isExpanded ? '🔽' : '▶️'}
            </span>
          </div>
        </div>
      </div>

      {/* Task Details - Expandable */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Timing</h4>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-gray-600">Created:</span> {formatDate(task.createdAt)}
                </div>
                {task.startedAt && (
                  <div>
                    <span className="text-gray-600">Started:</span> {formatDate(task.startedAt)}
                  </div>
                )}
                {task.completedAt && (
                  <div>
                    <span className="text-gray-600">Completed:</span> {formatDate(task.completedAt)}
                  </div>
                )}
                {task.updatedAt && (
                  <div>
                    <span className="text-gray-600">Last Activity:</span> {formatDate(task.updatedAt)}
                  </div>
                )}
                {task.startedAt && (
                  <div>
                    <span className="text-gray-600">Duration:</span> {formatDuration(task.startedAt, task.completedAt)}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Details</h4>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-gray-600">Full ID:</span>
                  <code className="ml-1 text-xs bg-gray-200 px-1 rounded">{task.id}</code>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span> {task.type}
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className={`ml-1 px-2 py-0.5 rounded text-xs ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                {typeof task.progress === 'number' && (
                  <div>
                    <span className="text-gray-600">Progress:</span> {task.progress}%
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          {task.message && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Message</h4>
              <div className="text-sm text-gray-700 bg-white p-3 rounded border">
                {task.message}
              </div>
            </div>
          )}

          {/* Error */}
          {task.error && (
            <div>
              <h4 className="font-medium text-red-900 mb-2">Error</h4>
              <div className="text-sm text-red-700 bg-red-50 p-3 rounded border border-red-200">
                {task.error}
              </div>
            </div>
          )}

          {/* Metadata */}
          {task.metadata && Object.keys(task.metadata).length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Metadata</h4>
              <div className="text-sm bg-white p-3 rounded border">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(task.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};