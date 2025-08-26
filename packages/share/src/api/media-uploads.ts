import { apiClient } from './client';
import { 
  VideoUploadResponse, 
  WebcomicUploadResponse, 
  StorageBackendsResponse, 
  DeleteFileResponse 
} from '../types';

// Upload API functions
export const mediaUploadsApi = {
  /**
   * Upload a video file. Admin only.
   * Uploads to configured storage backend (S3, Mux, or Local) and creates database record.
   * Optionally links to an existing media description.
   */
  uploadVideo: async (
    file: File,
    mediaDescriptionId?: string
  ): Promise<VideoUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (mediaDescriptionId) {
      formData.append('media_description_id', mediaDescriptionId);
    }

    const response = await apiClient.post('/upload/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data as VideoUploadResponse;
  },

  /**
   * Upload webcomic image files. Admin only.
   * Supports multiple image files for a single webcomic chapter.
   * Uploads to configured storage backend (S3 or Local) and creates database records.
   */
  uploadWebcomic: async (
    files: File[],
    mediaDescriptionId?: string,
    chapterNumber?: number
  ): Promise<WebcomicUploadResponse> => {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    if (mediaDescriptionId) {
      formData.append('media_description_id', mediaDescriptionId);
    }
    
    if (chapterNumber !== undefined) {
      formData.append('chapter_number', chapterNumber.toString());
    }

    const response = await apiClient.post('/upload/webcomic', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data as WebcomicUploadResponse;
  },

  /**
   * Get information about available storage backends. Admin only.
   */
  getAvailableBackends: async (): Promise<StorageBackendsResponse> => {
    const response = await apiClient.get('/upload/backends');
    return response.data as StorageBackendsResponse;
  },

  /**
   * Delete a file from storage. Admin only.
   */
  deleteFile: async (
    fileUrl: string,
    backend?: string
  ): Promise<DeleteFileResponse> => {
    const params = new URLSearchParams();
    params.append('file_url', fileUrl);
    
    if (backend) {
      params.append('backend', backend);
    }

    const response = await apiClient.delete(`/upload/file?${params.toString()}`);
    return response.data as DeleteFileResponse;
  },
};

// Export default for convenience
export default mediaUploadsApi;