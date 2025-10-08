import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface PathManagementSectionProps {
  configPath: string;
  folderPath: string;
  onConfigChange: (configPath: string, folderPath: string) => void;
  disabled?: boolean;
}

export const PathManagementSection: React.FC<PathManagementSectionProps> = ({
  configPath,
  folderPath,
  onConfigChange,
  disabled = false,
}) => {
  const [localConfigPath, setLocalConfigPath] = useLocalStorage('uploader.configPath', configPath);
  const [localFolderPath, setLocalFolderPath] = useLocalStorage('uploader.folderPath', folderPath);

  const handleConfigPathChange = (newConfigPath: string) => {
    setLocalConfigPath(newConfigPath);
    onConfigChange(newConfigPath, localFolderPath);
  };

  const handleFolderPathChange = (newFolderPath: string) => {
    setLocalFolderPath(newFolderPath);
    onConfigChange(localConfigPath, newFolderPath);
  };


  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <span className="mr-2">📁</span>
        Path Management
      </h2>

      <div className="space-y-4">
        {/* Config Path */}
        <div>
          <label htmlFor="config-path" className="block text-sm font-medium text-gray-700 mb-2">
            a) Config Path
          </label>
          <div>
            <input
              id="config-path"
              type="text"
              value={localConfigPath}
              onChange={(e) => handleConfigPathChange(e.target.value)}
              placeholder="Enter config file path (e.g., C:\path\to\config.ini)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={disabled}
            />
          </div>
          {localConfigPath && (
            <p className="mt-1 text-sm text-gray-600">
              Selected: {localConfigPath.split(/[/\\]/).pop()}
            </p>
          )}
        </div>

        {/* Folder to Treat Path */}
        <div>
          <label htmlFor="folder-path" className="block text-sm font-medium text-gray-700 mb-2">
            b) Folder to Treat Path
          </label>
          <div>
            <input
              id="folder-path"
              type="text"
              value={localFolderPath}
              onChange={(e) => handleFolderPathChange(e.target.value)}
              placeholder="Enter folder path to process (e.g., C:\path\to\videos)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={disabled}
            />
          </div>
          {localFolderPath && (
            <p className="mt-1 text-sm text-gray-600">
              Selected: {localFolderPath.split(/[/\\]/).pop()}
            </p>
          )}
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center text-sm">
          <span
            className={`w-3 h-3 rounded-full mr-2 ${
              localConfigPath && localFolderPath
                ? 'bg-green-500'
                : localConfigPath || localFolderPath
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
          />
          <span className="text-gray-600">
            {localConfigPath && localFolderPath
              ? 'Ready - Config and folder paths configured'
              : localConfigPath || localFolderPath
              ? 'Partially configured - Missing config or folder path'
              : 'Not configured - Please set config and folder paths'}
          </span>
        </div>
      </div>
    </div>
  );
};