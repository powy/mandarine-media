/**
 * LEGACY COMPONENT - NOT CURRENTLY USED
 *
 * This component is not imported or used in App.tsx.
 * The active UI uses SingleFolderSection.tsx instead.
 *
 * Kept for reference but may be removed in future cleanup.
 */
import React, { useState } from 'react';
import {
  useMediaAnalyzer,
  useMuxUpload,
  usePictureUpload,
  useSinglePictureUpload,
  useBatchPictureUpload,
  useSingleUpload,
  useBatchUpload,
  useParallelUpload,
  useExcelPrepare,
  useExcelBulkEdit,
} from '../hooks/useUploaderTasks';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface CommandPanelProps {
  configPath: string;
  folderPath: string;
  disabled: boolean;
}

interface CommandButtonProps {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  variant?: 'primary' | 'secondary' | 'warning';
}

const CommandButton: React.FC<CommandButtonProps> = ({
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
      <div className="text-sm font-semibold mb-1">{title}</div>
      <div className="text-xs opacity-80 text-center">{subtitle}</div>
    </button>
  );
};

export const CommandPanel: React.FC<CommandPanelProps> = ({
  configPath,
  folderPath,
  disabled,
}) => {
  const [bulkEditField, setBulkEditField] = useLocalStorage('uploader.bulkEditField', '');
  const [bulkEditValue, setBulkEditValue] = useLocalStorage('uploader.bulkEditValue', '');
  const [bulkEditDryRun, setBulkEditDryRun] = useLocalStorage('uploader.bulkEditDryRun', true);
  const [selectedPictureFile, setSelectedPictureFile] = useLocalStorage('uploader.commandPictureFile', '');
  const [selectedBatchPictureFile, setSelectedBatchPictureFile] = useLocalStorage('uploader.commandBatchPictureFile', '');
  const [parentFolderPath, setParentFolderPath] = useLocalStorage('uploader.commandParentFolderPath', '');

  // Hook up the mutations
  const mediaAnalyzer = useMediaAnalyzer();
  const muxUpload = useMuxUpload();
  const pictureUpload = usePictureUpload();
  const singlePictureUpload = useSinglePictureUpload();
  const batchPictureUpload = useBatchPictureUpload();
  const singleUpload = useSingleUpload();
  const batchUpload = useBatchUpload();
  const parallelUpload = useParallelUpload();
  const excelPrepare = useExcelPrepare();
  const excelBulkEdit = useExcelBulkEdit();

  const baseRequest = {
    folderPath,
    config: { configPath },
  };

  const handleMediaAnalyzer = () => {
    mediaAnalyzer.mutate({
      ...baseRequest,
      outputFormat: 'json',
      includeMetadata: true,
    });
  };

  const handleMuxUpload = () => {
    muxUpload.mutate({
      ...baseRequest,
      videoPath: folderPath, // Server will handle finding video files
      validateUpload: true,
    });
  };

  const handlePictureUpload = () => {
    pictureUpload.mutate({
      ...baseRequest,
      imagePath: folderPath, // Server will handle finding image files
      resize: true,
      quality: 85,
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


  const handleBatchPictureUpload = () => {
    if (!selectedBatchPictureFile) {
      alert('Please select a picture file first');
      return;
    }

    if (!parentFolderPath) {
      alert('Please specify the parent folder path');
      return;
    }

    batchPictureUpload.execute({
      picturePath: selectedBatchPictureFile,
      parentFolderPath: parentFolderPath,
      configPath: configPath,
      options: {
        detectFormat: true,
        requireExcelId: true,
        continueOnError: true,
        pattern: '0_desc',
        verbose: true
      }
    }).catch((error) => {
      alert(`Batch picture upload failed: ${error.message}`);
    });
  };


  const handleSingleUpload = () => {
    singleUpload.mutate(baseRequest);
  };

  const handleBatchUpload = () => {
    batchUpload.mutate({
      batchFolderPath: folderPath,
      config: { configPath },
    });
  };

  const handleParallelUpload = () => {
    parallelUpload.mutate({
      parentFolderPath: folderPath,
      config: { configPath },
      maxConcurrent: 5, // Default concurrent limit
    });
  };

  const handleExcelPrepare = () => {
    excelPrepare.mutate(baseRequest);
  };

  const handleExcelBulkEdit = () => {
    if (!bulkEditField || !bulkEditValue) {
      alert('Please enter both field name and value for bulk edit');
      return;
    }

    excelBulkEdit.mutate({
      ...baseRequest,
      fieldName: bulkEditField,
      fieldValue: bulkEditValue,
      dryRun: bulkEditDryRun,
    });
  };

  const isDisabled = disabled || !configPath || !folderPath;

  return (
    <div className="space-y-6">
      {/* Analysis Commands */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="mr-2">🔍</span>
          Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CommandButton
            title="Media Analyzer"
            subtitle="Analyze and associate video, subtitle, and image files"
            icon="🎬"
            onClick={handleMediaAnalyzer}
            disabled={isDisabled}
            loading={mediaAnalyzer.isPending}
          />
        </div>
      </div>

      {/* Upload Commands */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="mr-2">🚀</span>
          Upload Commands
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CommandButton
            title="Mux Upload"
            subtitle="Upload videos to Mux platform"
            icon="📹"
            onClick={handleMuxUpload}
            disabled={isDisabled}
            loading={muxUpload.isPending}
          />
          <CommandButton
            title="Picture Upload"
            subtitle="Upload pictures to S3"
            icon="🖼️"
            onClick={handlePictureUpload}
            disabled={isDisabled}
            loading={pictureUpload.isPending}
          />
          <CommandButton
            title="Single Picture Upload"
            subtitle="Upload specific picture with format detection"
            icon="📸"
            onClick={handleSinglePictureUpload}
            disabled={isDisabled || !selectedPictureFile}
            loading={singlePictureUpload.isPending}
            variant="primary"
          />
          <CommandButton
            title="Single Upload"
            subtitle="Complete workflow for single folder"
            icon="📁"
            onClick={handleSingleUpload}
            disabled={isDisabled}
            loading={singleUpload.isPending}
          />
          <CommandButton
            title="Batch Upload"
            subtitle="Process multiple folders sequentially"
            icon="📦"
            onClick={handleBatchUpload}
            disabled={isDisabled}
            loading={batchUpload.isPending}
            variant="secondary"
          />
          <CommandButton
            title="Parallel Upload"
            subtitle="Process multiple folders in parallel"
            icon="🔄"
            onClick={handleParallelUpload}
            disabled={isDisabled}
            loading={parallelUpload.isPending}
            variant="warning"
          />
        </div>
      </div>

      {/* Single Picture Upload Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="mr-2">📸</span>
          Single Picture Upload
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="picture-file" className="block text-sm font-medium text-gray-700 mb-2">
              Select Picture File
            </label>
            <input
              id="picture-file"
              type="text"
              value={selectedPictureFile}
              onChange={(e) => setSelectedPictureFile(e.target.value)}
              placeholder="Enter picture file path (e.g., C:\path\to\image.jpg)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedPictureFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedPictureFile}
              </p>
            )}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Format Detection Info</h3>
            <p className="text-sm text-blue-700">
              Supported formats: 1920x1080, 1920x720, 1080x1080, 810x1080, 1080x1920
            </p>
            <p className="text-sm text-blue-700 mt-1">
              The system will automatically detect the format from image dimensions and find the media description ID from the Excel file.
            </p>
          </div>
        </div>
      </div>

      {/* Batch Picture Upload Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="mr-2">🎯</span>
          Batch Picture Upload
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="batch-picture-file" className="block text-sm font-medium text-gray-700 mb-2">
              Select Picture File
            </label>
            <input
              id="batch-picture-file"
              type="text"
              value={selectedBatchPictureFile}
              onChange={(e) => setSelectedBatchPictureFile(e.target.value)}
              placeholder="Enter picture file path (e.g., C:\path\to\image.jpg)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedBatchPictureFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedBatchPictureFile}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="parent-folder-path" className="block text-sm font-medium text-gray-700 mb-2">
              Parent Folder Path (containing subfolders)
            </label>
            <input
              id="parent-folder-path"
              type="text"
              value={parentFolderPath}
              onChange={(e) => setParentFolderPath(e.target.value)}
              placeholder="e.g., /path/to/parent/folder/with/subfolders"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleBatchPictureUpload}
              disabled={disabled || !selectedBatchPictureFile || !parentFolderPath || batchPictureUpload.isPending}
              className={`
                flex flex-col items-center p-4 rounded-lg shadow-md transition-all duration-200
                ${disabled || !selectedBatchPictureFile || !parentFolderPath || batchPictureUpload.isPending
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-500 hover:bg-purple-600 text-white hover:shadow-lg transform hover:scale-105'
                }
                min-h-[120px] w-full
              `}
            >
              <div className="text-2xl mb-2">{batchPictureUpload.isPending ? '⏳' : '🎯'}</div>
              <div className="text-sm font-semibold mb-1">Batch Picture Upload</div>
              <div className="text-xs opacity-80 text-center">Upload once, associate to all subfolders</div>
            </button>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-purple-800 mb-2">Batch Operation Info</h3>
            <p className="text-sm text-purple-700">
              This will upload the picture once to the parent folder, then associate it to all subfolder media_descriptions.
            </p>
            <p className="text-sm text-purple-700 mt-1">
              Format: Automatically detected (1920x1080, 1920x720, 1080x1080, 810x1080, 1080x1920)
            </p>
            <p className="text-sm text-purple-700 mt-1">
              Process continues even if individual subfolders fail.
            </p>
          </div>
        </div>
      </div>

      {/* Excel Commands */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="mr-2">📊</span>
          Excel Operations
        </h2>

        {/* Excel Prepare */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <CommandButton
            title="Excel Prepare"
            subtitle="Create and prepare Excel templates"
            icon="📋"
            onClick={handleExcelPrepare}
            disabled={isDisabled}
            loading={excelPrepare.isPending}
          />
        </div>

        {/* Excel Bulk Edit */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Bulk Edit Excel Fields</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">📁 Current Folder Support</h4>
            <p className="text-sm text-blue-700 mb-2">
              You can now use folder-specific placeholders in field values. Each Excel file will get its own resolved value:
            </p>
            <div className="text-xs text-blue-600 space-y-1">
              <div><code className="bg-blue-100 px-1 rounded">{{current_folder}}</code> → Episode folder name (e.g., "S01E01")</div>
              <div><code className="bg-blue-100 px-1 rounded">{{folder_path}}</code> → Full folder path</div>
              <div><strong>Example:</strong> Setting field "episode" to "{{current_folder}}" will set "S01E01" for S01E01 folder, "S01E02" for S01E02 folder, etc.</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="bulk-field" className="block text-sm font-medium text-gray-700 mb-2">
                Field Name
              </label>
              <input
                id="bulk-field"
                type="text"
                value={bulkEditField}
                onChange={(e) => setBulkEditField(e.target.value)}
                placeholder="e.g., policy, status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="bulk-value" className="block text-sm font-medium text-gray-700 mb-2">
                New Value
              </label>
              <input
                id="bulk-value"
                type="text"
                value={bulkEditValue}
                onChange={(e) => setBulkEditValue(e.target.value)}
                placeholder="e.g., public, {{current_folder}}, active"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2 text-xs text-gray-600">
                💡 Use placeholders: <code className="bg-gray-100 px-1 rounded">{{current_folder}}</code> for folder name, <code className="bg-gray-100 px-1 rounded">{{folder_path}}</code> for full path
              </div>
            </div>
            <div>
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={bulkEditDryRun}
                  onChange={(e) => setBulkEditDryRun(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Dry Run (preview only)</span>
              </label>
              <CommandButton
                title="Bulk Edit"
                subtitle={bulkEditDryRun ? "Preview changes" : "Apply changes"}
                icon="✏️"
                onClick={handleExcelBulkEdit}
                disabled={isDisabled || !bulkEditField || !bulkEditValue}
                loading={excelBulkEdit.isPending}
                variant={bulkEditDryRun ? "secondary" : "warning"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {isDisabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ Please configure both the config file path and folder path before running commands.
          </p>
        </div>
      )}
    </div>
  );
};