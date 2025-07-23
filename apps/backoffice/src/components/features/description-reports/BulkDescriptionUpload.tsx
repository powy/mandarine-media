import React, { useState, useCallback } from 'react';
import { useBulkDescriptions } from 'share';
import { 
  CloudArrowUpIcon, 
  DocumentArrowDownIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface BulkDescriptionUploadProps {
  onUploadComplete?: (result: any) => void;
}

export const BulkDescriptionUpload: React.FC<BulkDescriptionUploadProps> = ({
  onUploadComplete
}) => {
  const {
    parseExcelFile,
    generateTemplate,
    createBulkDescriptions,
    loading,
    error,
    lastResult,
    clearError,
    resetState
  } = useBulkDescriptions();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await handleFileSelection(files[0]);
    }
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await handleFileSelection(files[0]);
    }
  }, []);

  const handleFileSelection = async (file: File) => {
    try {
      setSelectedFile(file);
      clearError();
      
      const result = await parseExcelFile(file);
      setParseResult(result);
      setStep('preview');
    } catch (err) {
      console.error('Error parsing file:', err);
    }
  };

  const handleConfirmUpload = async () => {
    if (!parseResult || !parseResult.data) return;
    
    try {
      const result = await createBulkDescriptions(parseResult.data);
      setStep('complete');
      onUploadComplete?.(result);
    } catch (err) {
      console.error('Error creating bulk descriptions:', err);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = generateTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'media_descriptions_template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setStep('upload');
    resetState();
  };

  if (step === 'complete' && lastResult) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Upload Complete!
          </h3>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-green-600">
                {lastResult.created_count}
              </span> descriptions created successfully
            </p>
            {lastResult.failed_count > 0 && (
              <p className="text-sm text-gray-600">
                <span className="font-medium text-red-600">
                  {lastResult.failed_count}
                </span> descriptions failed
              </p>
            )}
            <p className="text-xs text-gray-500">
              Batch ID: {lastResult.batch_id}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Upload Another File
          </button>
        </div>
      </div>
    );
  }

  if (step === 'preview' && parseResult) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Preview Upload Data
        </h3>
        
        <div className="mb-6">
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-md">
            <div>
              <p className="font-medium text-gray-900">
                {selectedFile?.name}
              </p>
              <p className="text-sm text-gray-600">
                {parseResult.data.length} descriptions ready to upload
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Choose different file
            </button>
          </div>
        </div>

        {parseResult.errors && parseResult.errors.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  Parsing Warnings ({parseResult.errors.length})
                </h4>
                <div className="mt-2 text-sm text-yellow-700 max-h-32 overflow-y-auto">
                  {parseResult.errors.map((error, index) => (
                    <div key={index}>
                      Row {error.row}: {error.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Sample Data (first 3 rows):
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left font-medium text-gray-500">File Number</th>
                  <th className="px-2 py-1 text-left font-medium text-gray-500">Title</th>
                  <th className="px-2 py-1 text-left font-medium text-gray-500">Type</th>
                  <th className="px-2 py-1 text-left font-medium text-gray-500">Expected Filename</th>
                </tr>
              </thead>
              <tbody>
                {parseResult.data.slice(0, 3).map((item, index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="px-2 py-1 text-gray-900">{item.file_number}</td>
                    <td className="px-2 py-1 text-gray-900">{item.episode_title}</td>
                    <td className="px-2 py-1 text-gray-900">{item.media_type}</td>
                    <td className="px-2 py-1 text-gray-900">{item.expected_filename || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmUpload}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Uploading...' : `Upload ${parseResult.data.length} Descriptions`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Bulk Upload Media Descriptions
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Upload an Excel file with media descriptions to create multiple entries at once
        </p>

        {/* Download Template Button */}
        <div className="mb-6">
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Download Template
          </button>
        </div>

        {/* File Drop Zone */}
        <div
          className={clsx(
            'relative border-2 border-dashed rounded-lg p-8 transition-colors',
            dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300',
            loading && 'opacity-50 pointer-events-none'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={loading}
          />
          
          <div className="text-center">
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-900">
                Drop your Excel file here, or{' '}
                <span className="text-blue-600">browse</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports .xlsx, .xls, and .csv files up to 10MB
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <XCircleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">
                  Upload Error
                </h4>
                <div className="mt-1 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-gray-600">Processing file...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};