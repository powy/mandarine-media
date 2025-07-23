import { renderHook, act, waitFor } from '@testing-library/react';
import { useDescriptionReports } from '../hooks/useDescriptionReports';
import { mediaApi } from '../api/media';

// Mock the API
jest.mock('../api/media');

const mockMediaApi = mediaApi as jest.Mocked<typeof mediaApi>;

// Mock timers
jest.useFakeTimers();

describe('useDescriptionReports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  const mockReportsResponse = {
    data: [
      {
        id: 'report-1',
        description_id: 'desc-1',
        title: 'Test Report 1',
        success_associated_file: true,
        timestamp: '2025-01-01T00:00:00Z',
        batch_id: 'batch-1'
      },
      {
        id: 'report-2',
        description_id: 'desc-2',
        title: 'Test Report 2',
        success_associated_file: false,
        timestamp: '2025-01-01T01:00:00Z',
        batch_id: 'batch-1'
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      total_pages: 1
    }
  };

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useDescriptionReports());

    expect(result.current.reports).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.pagination).toBe(null);
  });

  it('should fetch reports on mount', async () => {
    mockMediaApi.getDescriptionReports.mockResolvedValue(mockReportsResponse);

    const { result } = renderHook(() => useDescriptionReports());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.reports).toEqual(mockReportsResponse.data);
    expect(result.current.pagination).toEqual(mockReportsResponse.pagination);
    expect(result.current.error).toBe(null);
    expect(mockMediaApi.getDescriptionReports).toHaveBeenCalledWith(0, 20);
  });

  it('should handle fetch errors', async () => {
    const errorMessage = 'Failed to fetch reports';
    mockMediaApi.getDescriptionReports.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useDescriptionReports());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.reports).toEqual([]);
    expect(result.current.pagination).toBe(null);
  });

  it('should use custom options', async () => {
    mockMediaApi.getDescriptionReports.mockResolvedValue(mockReportsResponse);

    const { result } = renderHook(() => 
      useDescriptionReports({ skip: 10, limit: 5 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockMediaApi.getDescriptionReports).toHaveBeenCalledWith(10, 5);
  });

  it('should refresh data', async () => {
    mockMediaApi.getDescriptionReports.mockResolvedValue(mockReportsResponse);

    const { result } = renderHook(() => useDescriptionReports());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the mock to ensure refresh is called
    mockMediaApi.getDescriptionReports.mockClear();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockMediaApi.getDescriptionReports).toHaveBeenCalledTimes(1);
  });

  it('should load specific page', async () => {
    mockMediaApi.getDescriptionReports.mockResolvedValue(mockReportsResponse);

    const { result } = renderHook(() => useDescriptionReports({ limit: 10 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the mock to ensure loadPage is called
    mockMediaApi.getDescriptionReports.mockClear();

    await act(async () => {
      await result.current.loadPage(3);
    });

    // Page 3 with limit 10 should skip 20 items
    expect(mockMediaApi.getDescriptionReports).toHaveBeenCalledWith(20, 10);
  });

  it('should get reports by batch ID', async () => {
    const mockBatchReports = [mockReportsResponse.data[0]];
    mockMediaApi.getDescriptionReportsByBatch.mockResolvedValue(mockBatchReports);

    const { result } = renderHook(() => useDescriptionReports());

    let batchReports;
    await act(async () => {
      batchReports = await result.current.getReportsByBatch('batch-1');
    });

    expect(batchReports).toEqual(mockBatchReports);
    expect(mockMediaApi.getDescriptionReportsByBatch).toHaveBeenCalledWith('batch-1');
  });

  it('should get reports by description ID', async () => {
    const mockDescriptionReports = [mockReportsResponse.data[0]];
    mockMediaApi.getDescriptionReportsByDescription.mockResolvedValue(mockDescriptionReports);

    const { result } = renderHook(() => useDescriptionReports());

    let descriptionReports;
    await act(async () => {
      descriptionReports = await result.current.getReportsByDescription('desc-1');
    });

    expect(descriptionReports).toEqual(mockDescriptionReports);
    expect(mockMediaApi.getDescriptionReportsByDescription).toHaveBeenCalledWith('desc-1');
  });

  it('should handle errors in getReportsByBatch', async () => {
    mockMediaApi.getDescriptionReportsByBatch.mockRejectedValue(new Error('Batch error'));

    const { result } = renderHook(() => useDescriptionReports());

    await act(async () => {
      await expect(result.current.getReportsByBatch('batch-1')).rejects.toThrow('Batch error');
    });
  });

  it('should handle errors in getReportsByDescription', async () => {
    mockMediaApi.getDescriptionReportsByDescription.mockRejectedValue(new Error('Description error'));

    const { result } = renderHook(() => useDescriptionReports());

    await act(async () => {
      await expect(result.current.getReportsByDescription('desc-1')).rejects.toThrow('Description error');
    });
  });

  describe('auto-refresh', () => {
    it('should auto-refresh when enabled', async () => {
      mockMediaApi.getDescriptionReports.mockResolvedValue(mockReportsResponse);

      const { result } = renderHook(() => 
        useDescriptionReports({ autoRefresh: true, refreshInterval: 1000 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initial call on mount
      expect(mockMediaApi.getDescriptionReports).toHaveBeenCalledTimes(1);

      // Clear mock and advance time
      mockMediaApi.getDescriptionReports.mockClear();
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockMediaApi.getDescriptionReports).toHaveBeenCalledTimes(1);
      });
    });

    it('should not auto-refresh when disabled', async () => {
      mockMediaApi.getDescriptionReports.mockResolvedValue(mockReportsResponse);

      const { result } = renderHook(() => 
        useDescriptionReports({ autoRefresh: false })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initial call on mount
      expect(mockMediaApi.getDescriptionReports).toHaveBeenCalledTimes(1);

      // Clear mock and advance time
      mockMediaApi.getDescriptionReports.mockClear();
      
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should not have been called again
      expect(mockMediaApi.getDescriptionReports).not.toHaveBeenCalled();
    });

    it('should cleanup auto-refresh interval on unmount', async () => {
      mockMediaApi.getDescriptionReports.mockResolvedValue(mockReportsResponse);

      const { result, unmount } = renderHook(() => 
        useDescriptionReports({ autoRefresh: true, refreshInterval: 1000 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Unmount the hook
      unmount();

      // Clear mock and advance time
      mockMediaApi.getDescriptionReports.mockClear();
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should not have been called after unmount
      expect(mockMediaApi.getDescriptionReports).not.toHaveBeenCalled();
    });
  });
});