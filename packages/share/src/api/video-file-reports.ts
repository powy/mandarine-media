import { apiClient } from './client';
import { VideoFileReport, VideoFileReportParams } from '../types';

export interface VideoFileReportList {
  data: VideoFileReport[];
  pagination: {
    skip: number;
    limit: number;
    total: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface VideoFileReportRequestParams {
  skip?: number;
  limit?: number;
  event?: string;
}

export const videoFileReportsApi = {
  /**
   * Get list of video file reports
   */
  getReports: async (params?: VideoFileReportParams): Promise<VideoFileReportList> => {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.event) searchParams.append('event', params.event);

    const response = await apiClient.get(`/video-file-reports?${searchParams}`);
    return response.data;
  },

  /**
   * Get specific video file report by ID
   */
  getReport: async (reportId: string): Promise<VideoFileReport> => {
    const response = await apiClient.get(`/video-file-reports/${reportId}`);
    return response.data;
  },

  /**
   * Get all reports for a specific video file
   */
  getReportsByVideoFile: async (videoFileId: string): Promise<VideoFileReport[]> => {
    const response = await apiClient.get(`/video-file-reports/video-file/${videoFileId}`);
    return response.data;
  },

  /**
   * Destroy actual video file (create destruction report)
   */
  destroyVideoFile: async (videoFileId: string): Promise<{ message: string; video_file_id: string; status: string }> => {
    // v1.9: Updated to flat URL structure
    const response = await apiClient.post(`/video-files/${videoFileId}/destroy`);
    return response.data;
  },
};