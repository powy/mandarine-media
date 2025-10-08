import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface LogsSectionProps {
  className?: string;
}

export const LogsSection: React.FC<LogsSectionProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef(0);

  // Add initial welcome message
  useEffect(() => {
    addLogEntry('info', 'Media Uploader UI initialized. Configure paths and start operations.');
  }, []);

  const addLogEntry = (level: LogEntry['level'], message: string) => {
    const newLog: LogEntry = {
      id: `log-${++logIdCounter.current}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };

    setLogs(prevLogs => {
      const updatedLogs = [...prevLogs, newLog];
      // Keep only the last 1000 entries to prevent memory issues
      return updatedLogs.slice(-1000);
    });
  };

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);


  const clearLogs = () => {
    setLogs([]);
    addLogEntry('info', 'Logs cleared');
  };

  const toggleAutoScroll = () => {
    setAutoScroll(!autoScroll);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getLogCount = (level: string) => {
    if (level === 'all') return logs.length;
    return logs.filter(log => log.level === level).length;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <span className="mr-2">📝</span>
          Logs
        </h2>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All ({getLogCount('all')})</option>
            <option value="info">Info ({getLogCount('info')})</option>
            <option value="success">Success ({getLogCount('success')})</option>
            <option value="warning">Warning ({getLogCount('warning')})</option>
            <option value="error">Error ({getLogCount('error')})</option>
          </select>

          {/* Auto-scroll toggle */}
          <button
            onClick={toggleAutoScroll}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              autoScroll
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Auto-scroll
          </button>

          {/* Clear logs */}
          <button
            onClick={clearLogs}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div
        ref={logsContainerRef}
        className="bg-gray-50 rounded-lg border border-gray-200 p-4 h-80 overflow-y-auto"
        style={{ fontFamily: 'Monaco, Consolas, "Courier New", monospace' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            {filter === 'all' ? 'No logs yet' : `No ${filter} logs`}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded-md text-sm border-l-4 ${getLevelColor(log.level)} border-l-current`}
              >
                <div className="flex items-start space-x-2">
                  <span className="text-base">{getLevelIcon(log.level)}</span>
                  <span className="text-gray-500 text-xs font-mono">
                    {log.timestamp}
                  </span>
                  <span className="text-xs font-semibold uppercase">
                    {log.level}
                  </span>
                  <span className="flex-1 text-gray-800">
                    {log.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span>Total: {logs.length}</span>
          <span className="text-red-600">Errors: {getLogCount('error')}</span>
          <span className="text-yellow-600">Warnings: {getLogCount('warning')}</span>
          <span className="text-green-600">Success: {getLogCount('success')}</span>
        </div>

        {!autoScroll && (
          <button
            onClick={() => {
              if (logsContainerRef.current) {
                logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
              }
            }}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Scroll to bottom
          </button>
        )}
      </div>
    </div>
  );
};