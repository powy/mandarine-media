import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ConfigurationPanelProps {
  onConfigChange: (configPath: string, folderPath: string) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ onConfigChange }) => {
  const [configPath, setConfigPath] = useLocalStorage('uploader-config-path', '');
  const [folderPath, setFolderPath] = useLocalStorage('uploader-folder-path', '');

  const handleConfigPathChange = (value: string) => {
    setConfigPath(value);
    onConfigChange(value, folderPath);
  };

  const handleFolderPathChange = (value: string) => {
    setFolderPath(value);
    onConfigChange(configPath, value);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <span className="mr-2">⚙️</span>
        Configuration
      </h2>

      <div className="space-y-4">
        {/* Config File Path */}
        <div>
          <label htmlFor="config-path" className="block text-sm font-medium text-gray-700 mb-2">
            Configuration File Path
          </label>
          <div className="flex">
            <input
              id="config-path"
              type="text"
              value={configPath}
              onChange={(e) => handleConfigPathChange(e.target.value)}
              placeholder="Path to config.ini file (e.g., /path/to/config.ini)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => {
                alert('File browsing is not available in the web interface due to browser security restrictions. Please manually type the full path to your config.ini file.');
                document.getElementById('config-path')?.focus();
              }}
              className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Manual path entry required (browser security limitation)"
            >
              📁
            </button>
          </div>
          {!configPath && (
            <p className="mt-1 text-sm text-gray-500">
              Please specify the path to your config.ini file
            </p>
          )}
        </div>

        {/* Folder Path */}
        <div>
          <label htmlFor="folder-path" className="block text-sm font-medium text-gray-700 mb-2">
            Folder Path
          </label>
          <div className="flex">
            <input
              id="folder-path"
              type="text"
              value={folderPath}
              onChange={(e) => handleFolderPathChange(e.target.value)}
              placeholder="Path to media folder (e.g., /path/to/media)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => {
                alert('Folder browsing is not available in the web interface due to browser security restrictions. Please manually type the full path to your media folder.');
                document.getElementById('folder-path')?.focus();
              }}
              className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Manual path entry required (browser security limitation)"
            >
              📁
            </button>
          </div>
          {!folderPath && (
            <p className="mt-1 text-sm text-gray-500">
              Please specify the path to your media folder
            </p>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex space-x-4 text-sm">
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${configPath ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className={configPath ? 'text-green-700' : 'text-red-700'}>
              Config: {configPath ? 'Set' : 'Missing'}
            </span>
          </div>
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${folderPath ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className={folderPath ? 'text-green-700' : 'text-red-700'}>
              Folder: {folderPath ? 'Set' : 'Missing'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};