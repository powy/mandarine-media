import React, { useState } from 'react';
import {
  useBatchUpload,
  useParallelUpload,
  useBatchPictureUpload,
  useExcelBulkEdit,
  useExcelPrepare,
  useBatchExcelPrepare,
  usePropagateSeasonData,
} from '../hooks/useUploaderTasks';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface BatchTreatmentSectionProps {
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
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'purple';
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
    purple: 'bg-purple-500 hover:bg-purple-600 text-white',
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

export const BatchTreatmentSection: React.FC<BatchTreatmentSectionProps> = ({
  configPath,
  folderPath,
  disabled = false,
}) => {
  const [selectedBatchPictureFile, setSelectedBatchPictureFile] = useLocalStorage('uploader.batchPictureFile', '');
  const [parentFolderPath, setParentFolderPath] = useLocalStorage('uploader.batchParentFolderPath', '');
  const [bulkEditField, setBulkEditField] = useLocalStorage('uploader.batchBulkEditField', '');
  const [bulkEditValue, setBulkEditValue] = useLocalStorage('uploader.batchBulkEditValue', '');
  const [bulkEditDryRun, setBulkEditDryRun] = useLocalStorage('uploader.batchBulkEditDryRun', true);
  const [seasonId, setSeasonId] = useLocalStorage('uploader.propagateSeasonId', '');

  // Hook up the mutations
  const batchUpload = useBatchUpload();
  const parallelUpload = useParallelUpload();
  const batchPictureUpload = useBatchPictureUpload();
  const excelBulkEdit = useExcelBulkEdit();
  const excelPrepare = useExcelPrepare();
  const batchExcelPrepare = useBatchExcelPrepare();
  const propagateSeasonData = usePropagateSeasonData();

  const baseRequest = {
    folderPath,
    config: { configPath },
  };

  const isDisabled = disabled || !configPath || !folderPath;

  const handlePrepareExcelBatch = () => {
    batchExcelPrepare.mutate({
      parentFolderPath: folderPath,
      config: { configPath },
    });
  };

  const handleBatchUpload = () => {
    batchUpload.mutate({
      parentFolderPath: folderPath,
      config: { configPath },
      options: {
        maxConcurrency: 1000
      }
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

  const handlePropagateSeasonData = () => {
    if (!seasonId || !seasonId.trim()) {
      alert('Please enter a Season ID');
      return;
    }

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(seasonId.trim())) {
      alert('Please enter a valid Season ID (UUID format)');
      return;
    }

    propagateSeasonData.mutate({
      seasonId: seasonId.trim(),
      config: { configPath },
      options: {
        verbose: true
      }
    });
  };

  const handleParentFolderSelect = () => {
    // This would typically use a folder selection API
    const selectedPath = prompt('Enter parent folder path containing subfolders:');
    if (selectedPath) {
      setParentFolderPath(selectedPath);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <span className="mr-2">📦</span>
        Batch Treatment Operations
      </h2>

      {/* Main Batch Operations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* a) Prepare Excel Batch */}
        <ActionButton
          title="Prepare Excel Batch"
          subtitle="Generate Excel for all subfolders"
          icon="📋"
          onClick={handlePrepareExcelBatch}
          disabled={isDisabled}
          loading={batchExcelPrepare.isPending}
          variant="primary"
        />

        {/* b) Batch Upload */}
        <ActionButton
          title="Batch Upload"
          subtitle="Sequential processing"
          icon="🚀"
          onClick={handleBatchUpload}
          disabled={isDisabled}
          loading={batchUpload.isPending}
          variant="success"
        />

        {/* c) Batch Picture Upload (placeholder button) */}
        <ActionButton
          title="Batch Picture Upload"
          subtitle="Apply picture to subfolders"
          icon="🎯"
          onClick={handleBatchPictureUpload}
          disabled={isDisabled || !selectedBatchPictureFile || !parentFolderPath}
          loading={batchPictureUpload.isPending}
          variant="purple"
        />
      </div>

      {/* c) Batch Picture Upload Configuration */}
      <div className="border-t pt-6 mb-8">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <span className="mr-2">🎯</span>
          Batch Picture Upload Configuration
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Picture File
            </label>
            <div>
              <input
                type="text"
                value={selectedBatchPictureFile}
                onChange={(e) => setSelectedBatchPictureFile(e.target.value)}
                placeholder="Enter picture file path to apply to all subfolders (e.g., C:\path\to\image.jpg)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={disabled}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent Folder Path (containing subfolders)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={parentFolderPath}
                onChange={(e) => setParentFolderPath(e.target.value)}
                placeholder="Path to folder containing subfolders to process..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={disabled}
              />
              <button
                onClick={handleParentFolderSelect}
                disabled={disabled}
                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-300 transition-colors"
              >
                Browse
              </button>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-purple-800 mb-2">Batch Operation Info</h4>
            <p className="text-sm text-purple-700">
              This will upload the picture once to the parent folder, then associate it to all subfolder media_descriptions.
            </p>
            <p className="text-sm text-purple-700 mt-1">
              Format: Automatically detected (1920x1080, 1920x720, 1080x1080, 810x1080, 1080x1920)
            </p>
          </div>
        </div>
      </div>

      {/* e) Bulk Edit Excel Fields */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <span className="mr-2">✏️</span>
          Bulk Edit Excel Fields
        </h3>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">📁 Folder-specific Placeholders</h4>
            <p className="text-sm text-blue-700 mb-2">
              You can use folder-specific placeholders in field values:
            </p>
            <div className="text-xs text-blue-600 space-y-1">
              <div><code className="bg-blue-100 px-1 rounded">{'{{current_folder}}'}</code> → Episode folder name (e.g., "S01E01")</div>
              <div><code className="bg-blue-100 px-1 rounded">{'{{folder_path}}'}</code> → Full folder path</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Name
              </label>
              <input
                type="text"
                value={bulkEditField}
                onChange={(e) => setBulkEditField(e.target.value)}
                placeholder="e.g., policy, status, episode"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disabled}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Value
              </label>
              <input
                type="text"
                value={bulkEditValue}
                onChange={(e) => setBulkEditValue(e.target.value)}
                placeholder="e.g., public, {{current_folder}}, active"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disabled}
              />
              <div className="mt-1 text-xs text-gray-600">
                💡 Use <code className="bg-gray-100 px-1 rounded">{'{{current_folder}}'}</code> for folder name
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={bulkEditDryRun}
                  onChange={(e) => setBulkEditDryRun(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={disabled}
                />
                <span className="text-sm text-gray-700">Dry Run (preview only)</span>
              </label>
              <ActionButton
                title="Bulk Edit Excel"
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

      {/* f) Propagate Season Data */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <span className="mr-2">🔄</span>
          Propagate Season Data
        </h3>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">What does this do?</h4>
            <p className="text-sm text-blue-700 mb-2">
              Propagates missing data from a TV season to all its episodes. This copies:
            </p>
            <div className="text-xs text-blue-600 space-y-1 ml-4">
              <div>• <strong>Images:</strong> All format images (1920x1080, 1920x720, 1080x1080, 810x1080, 1080x1920)</div>
              <div>• <strong>Metadata:</strong> Summary, synopsis, production year, rights holder, copyright</div>
              <div>• <strong>Categories:</strong> Media categories, hashtags, audience categories, themes</div>
              <div>• <strong>People:</strong> Directors, producers, authors, actors</div>
              <div>• <strong>Geography:</strong> Origin countries, available countries, languages</div>
              <div>• <strong>Plans:</strong> Eligible subscription plans</div>
            </div>
            <p className="text-sm text-blue-700 mt-2">
              Only empty fields in episodes are filled - existing data is preserved.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Season ID (UUID)
            </label>
            <input
              type="text"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              placeholder="e.g., abc123de-f456-7890-abcd-ef1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              disabled={disabled}
            />
            <div className="mt-1 text-xs text-gray-600">
              💡 Get the Season ID from the season's Excel file (0_desc_season.xlsx) or backend
            </div>
          </div>

          <ActionButton
            title="Propagate Season Data"
            subtitle="Copy data from season to episodes"
            icon="🔄"
            onClick={handlePropagateSeasonData}
            disabled={disabled || !configPath || !seasonId}
            loading={propagateSeasonData.isPending}
            variant="primary"
          />
        </div>
      </div>

      {/* Status Message */}
      {isDisabled && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ Please configure both the config file path and folder path in the Path Management section before running batch operations.
          </p>
        </div>
      )}
    </div>
  );
};