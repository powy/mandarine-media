import { renderHook, act } from '@testing-library/react';
import { useBulkDescriptions } from '../hooks/useBulkDescriptions';
import { mediaApi } from '../api/media';
import { ExcelParser } from '../utils/excelParser';

// Mock the dependencies
jest.mock('../api/media');
jest.mock('../utils/excelParser');

const mockMediaApi = mediaApi as jest.Mocked<typeof mediaApi>;
const mockExcelParser = ExcelParser as jest.Mocked<typeof ExcelParser>;

describe('useBulkDescriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useBulkDescriptions());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.lastResult).toBe(null);
  });

  describe('parseExcelFile', () => {
    it('should parse Excel file successfully', async () => {
      const mockFile = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const mockParseResult = {
        data: [
          {
            file_number: 1001,
            episode_title: 'Test Episode',
            media_type: 'video' as const,
          }
        ],
        errors: []
      };

      mockExcelParser.parseFile.mockResolvedValue(mockParseResult);

      const { result } = renderHook(() => useBulkDescriptions());

      let parseResult;
      await act(async () => {
        parseResult = await result.current.parseExcelFile(mockFile);
      });

      expect(parseResult).toEqual(mockParseResult);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(mockExcelParser.parseFile).toHaveBeenCalledWith(mockFile);
    });

    it('should validate file type', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      const { result } = renderHook(() => useBulkDescriptions());

      await act(async () => {
        await expect(result.current.parseExcelFile(mockFile)).rejects.toThrow(
          'Invalid file type'
        );
      });

      expect(result.current.error).toContain('Invalid file type');
    });

    it('should validate file size', async () => {
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join(''); // > 10MB
      const mockFile = new File([largeContent], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const { result } = renderHook(() => useBulkDescriptions());

      await act(async () => {
        await expect(result.current.parseExcelFile(mockFile)).rejects.toThrow(
          'File too large'
        );
      });

      expect(result.current.error).toContain('File too large');
    });

    it('should handle empty parse result', async () => {
      const mockFile = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      mockExcelParser.parseFile.mockResolvedValue({
        data: [],
        errors: []
      });

      const { result } = renderHook(() => useBulkDescriptions());

      await act(async () => {
        await expect(result.current.parseExcelFile(mockFile)).rejects.toThrow(
          'No valid data found'
        );
      });

      expect(result.current.error).toContain('No valid data found');
    });

    it('should handle parsing errors', async () => {
      const mockFile = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      mockExcelParser.parseFile.mockRejectedValue(new Error('Parse error'));

      const { result } = renderHook(() => useBulkDescriptions());

      await act(async () => {
        await expect(result.current.parseExcelFile(mockFile)).rejects.toThrow(
          'Parse error'
        );
      });

      expect(result.current.error).toBe('Parse error');
    });
  });

  describe('createBulkDescriptions', () => {
    it('should create bulk descriptions successfully', async () => {
      const mockDescriptions = [
        {
          file_number: 1001,
          episode_title: 'Test Episode',
          media_type: 'video' as const,
        }
      ];

      const mockResponse = {
        created_count: 1,
        failed_count: 0,
        batch_id: 'batch-123',
        reports: []
      };

      mockMediaApi.createBulkMediaDescriptions.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkDescriptions());

      let createResult;
      await act(async () => {
        createResult = await result.current.createBulkDescriptions(mockDescriptions);
      });

      expect(createResult).toEqual(mockResponse);
      expect(result.current.lastResult).toEqual(mockResponse);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(mockMediaApi.createBulkMediaDescriptions).toHaveBeenCalledWith({
        descriptions: mockDescriptions
      });
    });

    it('should validate empty descriptions array', async () => {
      const { result } = renderHook(() => useBulkDescriptions());

      await act(async () => {
        await expect(result.current.createBulkDescriptions([])).rejects.toThrow(
          'No descriptions provided'
        );
      });

      expect(result.current.error).toContain('No descriptions provided');
    });

    it('should validate required fields', async () => {
      const mockDescriptions = [
        {
          file_number: 1001,
          episode_title: 'Test Episode',
          media_type: 'video' as const,
        },
        {
          // Missing file_number
          episode_title: 'Test Episode 2',
          media_type: 'video' as const,
        },
        {
          file_number: 1003,
          // Missing episode_title
          media_type: 'video' as const,
        }
      ];

      const { result } = renderHook(() => useBulkDescriptions());

      await act(async () => {
        await expect(result.current.createBulkDescriptions(mockDescriptions as any)).rejects.toThrow(
          'Validation errors'
        );
      });

      expect(result.current.error).toContain('Missing file_number');
      expect(result.current.error).toContain('Missing episode_title');
    });

    it('should handle API errors', async () => {
      const mockDescriptions = [
        {
          file_number: 1001,
          episode_title: 'Test Episode',
          media_type: 'video' as const,
        }
      ];

      mockMediaApi.createBulkMediaDescriptions.mockRejectedValue(
        new Error('API Error')
      );

      const { result } = renderHook(() => useBulkDescriptions());

      await act(async () => {
        await expect(result.current.createBulkDescriptions(mockDescriptions)).rejects.toThrow(
          'API Error'
        );
      });

      expect(result.current.error).toBe('API Error');
    });
  });

  describe('generateTemplate', () => {
    it('should generate template blob', () => {
      const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      mockExcelParser.generateTemplate.mockReturnValue(mockBlob);

      const { result } = renderHook(() => useBulkDescriptions());

      const blob = result.current.generateTemplate();

      expect(blob).toBe(mockBlob);
      expect(mockExcelParser.generateTemplate).toHaveBeenCalled();
    });
  });

  describe('utility functions', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useBulkDescriptions());

      act(() => {
        // Set an error first
        result.current.parseExcelFile(new File([''], 'test.txt', { type: 'text/plain' }))
          .catch(() => {});
      });

      // Wait for error to be set, then clear it
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });

    it('should reset state', () => {
      const { result } = renderHook(() => useBulkDescriptions());

      // Set some state first
      const mockResult = {
        created_count: 1,
        failed_count: 0,
        batch_id: 'batch-123',
        reports: []
      };

      act(() => {
        // Simulate having a result
        (result.current as any).setLastResult(mockResult);
      });

      act(() => {
        result.current.resetState();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastResult).toBe(null);
    });
  });
});