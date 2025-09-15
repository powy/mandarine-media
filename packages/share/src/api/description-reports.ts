import { apiClient } from './client';
import {
  DescriptionReport,
  DescriptionReportListResponse,
  BaseApiParams
} from '../types';

/**
 * Description Reports API
 * Tracks the processing status and results of media description creation and bulk operations
 * API 1.13 Implementation
 */

export interface DescriptionReportFilters extends BaseApiParams {
  batch_id?: string;
  status?: 'success' | 'failed' | 'partial';
  description_id?: string;
}

export const descriptionReportsApi = {
  /**
   * List description reports with filtering and pagination
   * @param filters - Optional filters for reports
   * @returns Paginated list of description reports
   */
  async getDescriptionReports(filters?: DescriptionReportFilters): Promise<DescriptionReportListResponse> {
    const params = new URLSearchParams();
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.batch_id) params.append('batch_id', filters.batch_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.description_id) params.append('description_id', filters.description_id);

    const response = await apiClient.get<DescriptionReportListResponse>(`/description-reports?${params}`);
    return response.data;
  },

  /**
   * Get a single description report by ID
   * @param id - Report ID
   * @returns Description report details
   */
  async getDescriptionReport(id: string): Promise<DescriptionReport> {
    const response = await apiClient.get<DescriptionReport>(`/description-reports/${id}`);
    return response.data;
  },

  /**
   * Get all description reports for a specific batch operation
   * @param batchId - Batch operation ID
   * @returns Array of description reports for the batch
   */
  async getDescriptionReportsByBatch(batchId: string): Promise<DescriptionReport[]> {
    const response = await apiClient.get<DescriptionReport[]>(`/description-reports/batch/${batchId}`);
    return response.data;
  }
};

// Export individual functions for convenience
export const {
  getDescriptionReports,
  getDescriptionReport,
  getDescriptionReportsByBatch
} = descriptionReportsApi;