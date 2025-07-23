import { useState, useEffect, useCallback } from 'react';
import { mediaApi } from '../api/media';
import { DescriptionReport, DescriptionReportListResponse } from '../types';

export interface UseDescriptionReportsOptions {
  skip?: number;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseDescriptionReportsReturn {
  reports: DescriptionReport[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  refresh: () => Promise<void>;
  loadPage: (page: number) => Promise<void>;
  getReportsByBatch: (batchId: string) => Promise<DescriptionReport[]>;
  getReportsByDescription: (descriptionId: string) => Promise<DescriptionReport[]>;
}

export const useDescriptionReports = (
  options: UseDescriptionReportsOptions = {}
): UseDescriptionReportsReturn => {
  const {
    skip = 0,
    limit = 20,
    autoRefresh = false,
    refreshInterval = 30000
  } = options;

  const [reports, setReports] = useState<DescriptionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const fetchReports = useCallback(async (currentSkip = skip, currentLimit = limit) => {
    try {
      setLoading(true);
      setError(null);
      
      const response: DescriptionReportListResponse = await mediaApi.getDescriptionReports(
        currentSkip,
        currentLimit
      );
      
      setReports(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch description reports';
      setError(errorMessage);
      console.error('Error fetching description reports:', err);
    } finally {
      setLoading(false);
    }
  }, [skip, limit]);

  const refresh = useCallback(async () => {
    await fetchReports();
  }, [fetchReports]);

  const loadPage = useCallback(async (page: number) => {
    const newSkip = (page - 1) * limit;
    await fetchReports(newSkip, limit);
  }, [limit, fetchReports]);

  const getReportsByBatch = useCallback(async (batchId: string): Promise<DescriptionReport[]> => {
    try {
      return await mediaApi.getDescriptionReportsByBatch(batchId);
    } catch (err) {
      console.error('Error fetching reports by batch:', err);
      throw err;
    }
  }, []);

  const getReportsByDescription = useCallback(async (descriptionId: string): Promise<DescriptionReport[]> => {
    try {
      return await mediaApi.getDescriptionReportsByDescription(descriptionId);
    } catch (err) {
      console.error('Error fetching reports by description:', err);
      throw err;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchReports();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchReports]);

  return {
    reports,
    loading,
    error,
    pagination,
    refresh,
    loadPage,
    getReportsByBatch,
    getReportsByDescription,
  };
};