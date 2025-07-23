import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { VideoFile, useVideoUpload, useVideoPlayback } from 'share';
import { FormLayout } from '@/components/common';
import clsx from 'clsx';

interface VideoFileFormData {
  file_name: string;
  upload_method: 'new_upload' | 'existing_url';
  external_url?: string;
  media_description_id?: string;
  file?: File;
}

export const VideoFileForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showTest, setShowTest] = useState(false);
  
  const videoUpload = useVideoUpload();
  const videoPlayback = useVideoPlayback();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VideoFileFormData>({
    defaultValues: {
      upload_method: 'new_upload',
      file_name: '',
      external_url: '',
    },
  });

  const uploadMethod = watch('upload_method');
  const fileName = watch('file_name');

  // Update progress when uploading
  useEffect(() => {
    if (videoUpload.state.progress) {
      setUploadProgress(videoUpload.state.progress.progress);
      
      // Show test button when upload is completed
      if (videoUpload.state.progress.stage === 'completed') {
        setShowTest(true);
      }
    }
  }, [videoUpload.state.progress]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!fileName) {
        setValue('file_name', file.name);
      }
    }
  };

  const onSubmit = async (data: VideoFileFormData) => {
    try {
      const uploadOptions = {
        fileName: data.file_name,
        uploadMethod: data.upload_method,
        mediaDescriptionId: data.media_description_id,
        externalUrl: data.external_url,
        file: selectedFile || undefined,
      };

      const result = await videoUpload.upload(uploadOptions);
      
      if (result) {
        // Upload successful
        console.log('Upload successful:', result);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleCancel = () => {
    navigate('/video-files');
  };

  const handleTestPlayback = async () => {
    if (videoUpload.state.videoFile?.id) {
      await videoPlayback.testPlayback(videoUpload.state.videoFile.id);
    }
  };

  const isLoading = videoUpload.state.isUploading;
  const uploadCompleted = videoUpload.state.videoFile && videoUpload.state.progress?.stage === 'completed';

  return (
    <FormLayout
      title={isEdit ? 'Edit Video File' : 'Create Video File'}
      subtitle={isEdit ? 'Update video file information' : 'Add new video file with dual upload options'}
      onSave={!uploadCompleted ? handleSubmit(onSubmit) : undefined}
      onCancel={handleCancel}
      loading={isLoading}
      saveDisabled={isLoading || uploadCompleted}
      backPath="/video-files"
    >
      <form className="space-y-8">
        {/* Upload Method Selection */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Method</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Controller
                name="upload_method"
                control={control}
                render={({ field }) => (
                  <>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="new_upload"
                        checked={field.value === 'new_upload'}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-900">Upload new file</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="existing_url"
                        checked={field.value === 'existing_url'}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-900">Use existing media URL</span>
                    </label>
                  </>
                )}
              />
            </div>
          </div>
        </div>

        {/* File Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">File Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="form-label">File Name *</label>
              <Controller
                name="file_name"
                control={control}
                rules={{ required: 'File name is required' }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={clsx(
                      'form-input',
                      errors.file_name && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    )}
                    placeholder="Enter file name"
                  />
                )}
              />
              {errors.file_name && (
                <p className="form-error">{errors.file_name.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="form-label">Media Description ID (Optional)</label>
              <Controller
                name="media_description_id"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="form-input"
                    placeholder="Link to existing media description"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        {uploadMethod === 'new_upload' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">File Upload</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Select Video File *</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Upload Progress */}
              {isLoading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{videoUpload.state.progress?.message || 'Uploading...'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Existing URL Section */}
        {uploadMethod === 'existing_url' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">External Media URL</h3>
            <div>
              <label className="form-label">Media URL *</label>
              <Controller
                name="external_url"
                control={control}
                rules={{ 
                  required: uploadMethod === 'existing_url' ? 'External URL is required' : false,
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: 'Please enter a valid URL'
                  }
                }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="url"
                    className={clsx(
                      'form-input',
                      errors.external_url && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    )}
                    placeholder="https://example.com/video.mp4"
                  />
                )}
              />
              {errors.external_url && (
                <p className="form-error">{errors.external_url.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Upload Status */}
        {videoUpload.state.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{videoUpload.state.error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Status */}
        {uploadCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Upload Successful</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Video file has been uploaded successfully!</p>
                  {videoUpload.state.videoFile && (
                    <p className="mt-1">File ID: {videoUpload.state.videoFile.id}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Player Test Section */}
        {showTest && videoUpload.state.videoFile && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Test Video Playback</h3>
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleTestPlayback}
                disabled={videoPlayback.state.isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {videoPlayback.state.isLoading ? 'Testing...' : 'Test Video Playback'}
              </button>

              {videoPlayback.state.result && (
                <div className={clsx(
                  'border rounded-md p-4',
                  videoPlayback.state.result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                )}>
                  <h4 className={clsx(
                    'text-sm font-medium',
                    videoPlayback.state.result.success ? 'text-green-800' : 'text-red-800'
                  )}>
                    {videoPlayback.state.result.success ? 'Playback Test Successful' : 'Playback Test Failed'}
                  </h4>
                  {videoPlayback.state.result.success && videoPlayback.state.result.playbackUrl && (
                    <div className="mt-2 text-sm text-green-700">
                      <p>Playback URL: <a href={videoPlayback.state.result.playbackUrl} target="_blank" rel="noopener noreferrer" className="underline">{videoPlayback.state.result.playbackUrl}</a></p>
                      {videoPlayback.state.result.muxPlaybackId && (
                        <p>Mux Playback ID: {videoPlayback.state.result.muxPlaybackId}</p>
                      )}
                    </div>
                  )}
                  {!videoPlayback.state.result.success && videoPlayback.state.result.errorMessage && (
                    <div className="mt-2 text-sm text-red-700">
                      <p>Error: {videoPlayback.state.result.errorMessage}</p>
                    </div>
                  )}
                </div>
              )}

              {videoPlayback.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-700">Test failed: {videoPlayback.state.error}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </FormLayout>
  );
};