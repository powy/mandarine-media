import React, { useState } from 'react';
import {
  useExcelPrepare,
  useSingleUpload,
  useSinglePictureUpload,
  useSubtitleUpload,
} from '../hooks/useUploaderTasks';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface SingleFolderSectionProps {
  configPath: string;
  folderPath: string;
  disabled?: boolean;
}

interface ActionButtonProps {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
}

const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  subtitle,
  icon,
  onClick,
  disabled,
  loading,
  variant = 'primary',
}) => {
  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    warning: 'bg-orange-500 hover:bg-orange-600 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        flex flex-col items-center p-4 rounded-lg shadow-md transition-all duration-200
        ${disabled || loading
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : variants[variant] + ' hover:shadow-lg transform hover:scale-105'
        }
        min-h-[120px] w-full
      `}
    >
      <div className="text-2xl mb-2">{loading ? '⏳' : icon}</div>
      <div className="text-sm font-semibold mb-1 text-center">{title}</div>
      <div className="text-xs opacity-80 text-center">{subtitle}</div>
    </button>
  );
};

export const SingleFolderSection: React.FC<SingleFolderSectionProps> = ({
  configPath,
  folderPath,
  disabled = false,
}) => {
  const [selectedPictureFile, setSelectedPictureFile] = useLocalStorage('uploader.singlePictureFile', '');
  const [selectedSubtitleFile, setSelectedSubtitleFile] = useLocalStorage('uploader.subtitleFile', '');
  const [selectedLanguage, setSelectedLanguage] = useLocalStorage('uploader.subtitleLanguage', 'fr');

  // Hook up the mutations
  const excelPrepare = useExcelPrepare();
  const singleUpload = useSingleUpload();
  const singlePictureUpload = useSinglePictureUpload();
  const subtitleUpload = useSubtitleUpload();

  const baseRequest = {
    folderPath,
    config: { configPath },
  };

  const isDisabled = disabled || !configPath || !folderPath;

  const handleExcelPrepare = () => {
    excelPrepare.mutate(baseRequest);
  };

  const handleSingleUpload = () => {
    singleUpload.execute(baseRequest).catch((error) => {
      alert(`Single upload failed: ${error.message}`);
    });
  };

  const handleSinglePictureUpload = () => {
    if (!selectedPictureFile) {
      alert('Please select a picture file first');
      return;
    }

    singlePictureUpload.execute({
      picturePath: selectedPictureFile,
      folderPath: folderPath,
      configPath: configPath,
      options: {
        detectFormat: true,
        requireExcelId: true,
        verbose: true
      }
    }).catch((error) => {
      alert(`Single picture upload failed: ${error.message}`);
    });
  };

  const handleSubtitleUpload = () => {
    if (!selectedSubtitleFile) {
      alert('Please select a subtitle file first');
      return;
    }

    subtitleUpload.mutate({
      ...baseRequest,
      subtitlePath: selectedSubtitleFile,
      options: {
        languageOverride: selectedLanguage,
        autoDetectLanguage: false,
        autoLookupMediaId: true
      }
    });
  };


  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <span className="mr-2">🎬</span>
        Single Folder Operations
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* a) Prepare Excel */}
        <ActionButton
          title="Prepare Excel"
          subtitle="Create and fill Excel template"
          icon="📋"
          onClick={handleExcelPrepare}
          disabled={isDisabled}
          loading={excelPrepare.isPending}
          variant="primary"
        />

        {/* b) Single Upload */}
        <ActionButton
          title="Single Upload"
          subtitle="Complete upload workflow"
          icon="🚀"
          onClick={handleSingleUpload}
          disabled={isDisabled}
          loading={singleUpload.isPending}
          variant="success"
        />

        {/* c) Single Picture Upload */}
        <ActionButton
          title="Single Picture Upload"
          subtitle="Upload specific picture"
          icon="📸"
          onClick={handleSinglePictureUpload}
          disabled={isDisabled || !selectedPictureFile}
          loading={singlePictureUpload.isPending}
          variant="secondary"
        />

        {/* d) Subtitle Upload */}
        <ActionButton
          title="Subtitle Upload"
          subtitle="Upload subtitle files"
          icon="📝"
          onClick={handleSubtitleUpload}
          disabled={isDisabled || !selectedSubtitleFile}
          loading={subtitleUpload.isPending}
          variant="warning"
        />
      </div>

      {/* Single Picture Upload Configuration */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <span className="mr-2">📸</span>
          Picture Upload Configuration
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Picture File
            </label>
            <div>
              <input
                type="text"
                value={selectedPictureFile}
                onChange={(e) => setSelectedPictureFile(e.target.value)}
                placeholder="Enter picture file path (e.g., C:\path\to\image.jpg)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disabled}
              />
            </div>
            {selectedPictureFile && (
              <p className="mt-1 text-sm text-gray-600">
                Selected: {selectedPictureFile.split(/[/\\]/).pop()}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Format Detection Info</h4>
            <p className="text-sm text-blue-700">
              Supported formats: 1920x1080, 1920x720, 1080x1080, 810x1080, 1080x1920
            </p>
            <p className="text-sm text-blue-700 mt-1">
              The system will automatically detect the format from image dimensions and find the media description ID from the Excel file.
            </p>
          </div>
        </div>
      </div>

      {/* Subtitle Upload Configuration */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <span className="mr-2">📝</span>
          Subtitle Upload Configuration
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subtitle Path
            </label>
            <div>
              <input
                type="text"
                value={selectedSubtitleFile}
                onChange={(e) => setSelectedSubtitleFile(e.target.value)}
                placeholder="Enter subtitle file path (e.g., C:\path\to\subtitle.srt)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disabled}
              />
            </div>
            {selectedSubtitleFile && (
              <p className="mt-1 text-sm text-gray-600">
                Selected: {selectedSubtitleFile.split(/[/\\]/).pop()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={disabled}
            >
              <option value="fr">Français (fr)</option>
              <option value="en">English (en)</option>
              <option value="ko">한국어 (ko)</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Subtitle Upload Info</h4>
            <p className="text-sm text-blue-700">
              The subtitle will be uploaded with the selected language code. The system will find the media description ID from the Excel file in the folder.
            </p>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {isDisabled && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ Please configure both the config file path and folder path in the Path Management section before running operations.
          </p>
        </div>
      )}
    </div>
  );
};