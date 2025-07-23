import { useState, useCallback } from 'react';
import { mediaApi } from '../api/media';
import { ExcelParser } from '../utils/excelParser';
import { 
  MediaDescriptionCreate, 
  BulkMediaDescriptionResponse, 
  ExcelParseResult 
} from '../types';

export interface UseBulkDescriptionsReturn {
  // File parsing
  parseExcelFile: (file: File) => Promise<ExcelParseResult>;
  generateTemplate: () => Blob;
  
  // Bulk creation
  createBulkDescriptions: (descriptions: MediaDescriptionCreate[]) => Promise<BulkMediaDescriptionResponse>;
  
  // State
  loading: boolean;
  error: string | null;
  lastResult: BulkMediaDescriptionResponse | null;
  
  // Utilities
  clearError: () => void;
  resetState: () => void;
}

export const useBulkDescriptions = (): UseBulkDescriptionsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<BulkMediaDescriptionResponse | null>(null);

  const parseExcelFile = useCallback(async (file: File): Promise<ExcelParseResult> => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file.');
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 10MB.');
      }
      
      const result = await ExcelParser.parseFile(file);
      
      if (result.data.length === 0) {
        throw new Error('No valid data found in the Excel file.');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse Excel file';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateTemplate = useCallback((): Blob => {
    return ExcelParser.generateTemplate();
  }, []);

  const createBulkDescriptions = useCallback(async (
    descriptions: MediaDescriptionCreate[]
  ): Promise<BulkMediaDescriptionResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      if (!descriptions || descriptions.length === 0) {
        throw new Error('No descriptions provided for bulk creation.');
      }
      
      // Validate descriptions before sending
      const validationErrors: string[] = [];
      descriptions.forEach((desc, index) => {
        if (!desc.file_number) {
          validationErrors.push(`Row ${index + 1}: Missing file_number`);
        }
        if (!desc.episode_title) {
          validationErrors.push(`Row ${index + 1}: Missing episode_title`);
        }
        if (!desc.media_type) {
          validationErrors.push(`Row ${index + 1}: Missing media_type`);
        }
      });
      
      if (validationErrors.length > 0) {
        throw new Error(`Validation errors:\n${validationErrors.join('\n')}`);
      }
      
      const response = await mediaApi.createBulkMediaDescriptions({ descriptions });
      setLastResult(response);
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create bulk descriptions';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetState = useCallback(() => {
    setLoading(false);
    setError(null);
    setLastResult(null);
  }, []);

  return {
    parseExcelFile,
    generateTemplate,
    createBulkDescriptions,
    loading,
    error,
    lastResult,
    clearError,
    resetState,
  };
};