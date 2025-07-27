import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExcelParser } from '../utils/excelParser';
import { MediaDescriptionCreate } from '../types';

// Mock XLSX since it's not available in test environment
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    json_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(),
}));

describe('ExcelParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertRow', () => {
    it('should convert valid row data correctly', () => {
      const mockData = [
        {
          'file_number': '1001',
          'episode_title': 'Test Episode',
          'media_type': 'video',
          'expected_filename': 'test.mp4',
          'is_premium_content': 'false',
          'is_featured': 'true',
          'content_status': 'draft'
        }
      ];

      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
      });
      XLSX.utils.sheet_to_json.mockReturnValue(mockData);

      const file = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Test the private conversion logic through parseFile
      return ExcelParser.parseFile(file).then(result => {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual(
          expect.objectContaining({
            file_number: 1001,
            episode_title: 'Test Episode',
            media_type: 'video',
            expected_filename: 'test.mp4',
            is_premium_content: false,
            is_featured: true,
            content_status: 'draft'
          })
        );
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should handle alternative column names', () => {
      const mockData = [
        {
          'File Number': '1002',
          'Title': 'Alternative Headers Test',
          'Type': 'video',
          'Premium': 'yes',
          'Status': 'published'
        }
      ];

      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
      });
      XLSX.utils.sheet_to_json.mockReturnValue(mockData);

      const file = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      return ExcelParser.parseFile(file).then(result => {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual(
          expect.objectContaining({
            file_number: 1002,
            episode_title: 'Alternative Headers Test',
            media_type: 'video',
            is_premium_content: true,
            content_status: 'published'
          })
        );
      });
    });

    it('should validate required fields', () => {
      const mockData = [
        {
          'episode_title': 'Missing File Number',
          'media_type': 'video'
        },
        {
          'file_number': '1003',
          'media_type': 'video'
        },
        {
          'file_number': '1004',
          'episode_title': 'Missing Media Type'
        }
      ];

      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
      });
      XLSX.utils.sheet_to_json.mockReturnValue(mockData);

      const file = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      return ExcelParser.parseFile(file).then(result => {
        expect(result.data).toHaveLength(0);
        expect(result.errors).toHaveLength(3);
        expect(result.errors[0].message).toContain('Missing required field: file_number');
        expect(result.errors[1].message).toContain('Missing required field: episode_title');
        expect(result.errors[2].message).toContain('Missing required field: media_type');
      });
    });

    it('should validate media type enum', () => {
      const mockData = [
        {
          'file_number': '1005',
          'episode_title': 'Invalid Media Type',
          'media_type': 'invalid_type'
        }
      ];

      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
      });
      XLSX.utils.sheet_to_json.mockReturnValue(mockData);

      const file = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      return ExcelParser.parseFile(file).then(result => {
        expect(result.data).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toContain('Invalid media_type');
      });
    });

    it('should convert boolean values correctly', () => {
      const mockData = [
        {
          'file_number': '1006',
          'episode_title': 'Boolean Test',
          'media_type': 'video',
          'is_premium_content': 'true',
          'is_featured': '1'
        },
        {
          'file_number': '1007',
          'episode_title': 'Boolean Test 2',
          'media_type': 'video',
          'is_premium_content': 'false',
          'is_featured': '0'
        }
      ];

      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
      });
      XLSX.utils.sheet_to_json.mockReturnValue(mockData);

      const file = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      return ExcelParser.parseFile(file).then(result => {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].is_premium_content).toBe(true);
        expect(result.data[0].is_featured).toBe(true);
        expect(result.data[1].is_premium_content).toBe(false);
        expect(result.data[1].is_featured).toBe(false);
      });
    });

    it('should convert number fields correctly', () => {
      const mockData = [
        {
          'file_number': '1008',
          'episode_title': 'Number Test',
          'media_type': 'video',
          'episode_number': '5',
          'production_year': '2025',
          'duration_seconds': '3600'
        }
      ];

      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
      });
      XLSX.utils.sheet_to_json.mockReturnValue(mockData);

      const file = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      return ExcelParser.parseFile(file).then(result => {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].episode_number).toBe(5);
        expect(result.data[0].production_year).toBe(2025);
        expect(result.data[0].duration_seconds).toBe(3600);
      });
    });

    it('should handle array fields (comma-separated)', () => {
      const mockData = [
        {
          'file_number': '1009',
          'episode_title': 'Array Test',
          'media_type': 'video',
          'subtitle_languages_available': 'en,es,fr',
          'seo_keywords': 'test, example, video'
        }
      ];

      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} }
      });
      XLSX.utils.sheet_to_json.mockReturnValue(mockData);

      const file = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      return ExcelParser.parseFile(file).then(result => {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].subtitle_languages_available).toEqual(['en', 'es', 'fr']);
        expect(result.data[0].seo_keywords).toEqual(['test', 'example', 'video']);
      });
    });
  });

  describe('generateTemplate', () => {
    it('should generate a template blob', () => {
      const XLSX = require('xlsx');
      XLSX.utils.json_to_sheet.mockReturnValue({});
      XLSX.utils.book_new.mockReturnValue({});
      XLSX.utils.book_append_sheet.mockImplementation(() => {});
      XLSX.write.mockReturnValue(new ArrayBuffer(8));

      const blob = ExcelParser.generateTemplate();
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.write).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle file parsing errors', () => {
      const XLSX = require('xlsx');
      XLSX.read.mockImplementation(() => {
        throw new Error('Invalid file format');
      });

      const file = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      return expect(ExcelParser.parseFile(file)).rejects.toThrow('Failed to parse Excel file');
    });

    it('should handle empty workbook', () => {
      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue({
        SheetNames: [],
        Sheets: {}
      });

      const file = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      return expect(ExcelParser.parseFile(file)).rejects.toThrow('No sheets found in Excel file');
    });
  });
});