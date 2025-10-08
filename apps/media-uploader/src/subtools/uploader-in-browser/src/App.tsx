import React, { useState, useEffect } from 'react';
import { useUploaderHealth } from './hooks/useUploaderTasks';
import { useLocalStorage } from './hooks/useLocalStorage';
import { PathManagementSection } from './components/PathManagementSection';
import { SingleFolderSection } from './components/SingleFolderSection';
import { BatchTreatmentSection } from './components/BatchTreatmentSection';
import { LogsSection } from './components/LogsSection';
import { TaskMonitor } from './components/TaskMonitor';

function App() {
  const [configPath, setConfigPath] = useLocalStorage('uploader.configPath', '');
  const [folderPath, setFolderPath] = useLocalStorage('uploader.folderPath', '');
  const [serverConnected, setServerConnected] = useState(false);

  const { data: healthData, error: healthError, isLoading: healthLoading } = useUploaderHealth();

  // Update server connection status
  useEffect(() => {
    setServerConnected(!!healthData && !healthError);
  }, [healthData, healthError]);

  const handleConfigChange = (newConfigPath: string, newFolderPath: string) => {
    setConfigPath(newConfigPath);
    setFolderPath(newFolderPath);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="mr-2">📦</span>
                Kyool Media Uploader
              </h1>
              <span className="ml-4 text-sm text-gray-500">Browser Interface</span>
            </div>

            {/* Server Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    healthLoading
                      ? 'bg-yellow-500 animate-pulse'
                      : serverConnected
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-700">
                  {healthLoading
                    ? 'Connecting...'
                    : serverConnected
                    ? 'Server Connected'
                    : 'Server Disconnected'}
                </span>
              </div>

              {/* Server Info */}
              {healthData && (
                <div className="text-xs text-gray-500 hidden sm:block">
                  Uptime: {Math.floor(healthData.uptime / 3600)}h {Math.floor((healthData.uptime % 3600) / 60)}m
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Server Connection Error */}
        {!healthLoading && !serverConnected && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <span className="text-red-500 text-xl mr-3">❌</span>
              <div className="flex-1">
                <h3 className="text-red-800 font-medium">Server Connection Failed</h3>
                <p className="text-red-700 text-sm mt-1">
                  Could not connect to the media uploader server. Please ensure:
                </p>
                <ul className="text-red-700 text-sm mt-2 ml-4 list-disc">
                  <li>The server is running on <code className="bg-red-100 px-1 rounded">localhost:3039</code></li>
                  <li>Run <code className="bg-red-100 px-1 rounded">media-uploader server</code> to start the server</li>
                  <li>Check your network connection and firewall settings</li>
                </ul>
                <div className="mt-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Responsive Layout Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column: Sections 1, 2, 3 (on wide screens) */}
          <div className="xl:col-span-3 space-y-6">
            {/* Section 1: Path Management */}
            <PathManagementSection
              configPath={configPath}
              folderPath={folderPath}
              onConfigChange={handleConfigChange}
              disabled={!serverConnected}
            />

            {/* Section 2: Single Folder Operations */}
            <SingleFolderSection
              configPath={configPath}
              folderPath={folderPath}
              disabled={!serverConnected}
            />

            {/* Section 3: Batch Treatment Operations */}
            <BatchTreatmentSection
              configPath={configPath}
              folderPath={folderPath}
              disabled={!serverConnected}
            />
          </div>

          {/* Right Column: Section 4 - Logs (on wide screens) */}
          <div className="xl:col-span-1">
            <LogsSection className="h-fit xl:sticky xl:top-6" />
          </div>
        </div>

        {/* Task Monitor */}
        {serverConnected && (
          <div className="mt-6">
            <TaskMonitor />
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            This interface communicates with the media uploader server running on your local machine.
            {healthData && (
              <>
                {' '}Server is healthy with {healthData.tasks.total} total tasks
                ({healthData.tasks.running} running, {healthData.tasks.pending} pending).
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;