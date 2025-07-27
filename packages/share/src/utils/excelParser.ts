import * as XLSX from 'xlsx';
import { MediaDescriptionCreate, ExcelRow, ExcelParseResult } from '../types';

// Column mapping from Excel headers to MediaDescription fields
const COLUMN_MAPPING: Record<string, keyof MediaDescriptionCreate> = {
  'file_number': 'file_number',
  'episode_title': 'episode_title',
  'media_type': 'media_type',
  'file_name': 'file_name',
  'expected_filename': 'expected_filename',
  'program_id': 'program_id',
  'season_id': 'season_id',
  'episode_number': 'episode_number',
  'descriptive_summary_text': 'descriptive_summary_text',
  'synopsis_text': 'synopsis_text',
  'production_year': 'production_year',
  'duration_seconds': 'duration_seconds',
  'is_premium_content': 'is_premium_content',
  'is_featured': 'is_featured',
  'content_status': 'content_status',
  'rating_system': 'rating_system',
  'content_warning': 'content_warning',
  'original_language': 'original_language',
  'seo_title': 'seo_title',
  'seo_description': 'seo_description',
  'external_id': 'external_id',
  'source_platform': 'source_platform',
  'rights_holder': 'rights_holder',
  // Date fields
  'contract_start_date_utc': 'contract_start_date_utc',
  'contract_end_date_utc': 'contract_end_date_utc',
  'original_broadcast_date_utc': 'original_broadcast_date_utc',
  // URLs
  'main_thumbnail_url': 'main_thumbnail_url',
  'secondary_thumbnail_url': 'secondary_thumbnail_url',
  'trailer_url': 'trailer_url',
};

// Alternative column names (case-insensitive)
const ALTERNATIVE_COLUMN_NAMES: Record<string, keyof MediaDescriptionCreate> = {
  'file number': 'file_number',
  'filenumber': 'file_number',
  'episode title': 'episode_title',
  'title': 'episode_title',
  'media type': 'media_type',
  'type': 'media_type',
  'file name': 'file_name',
  'filename': 'file_name',
  'expected filename': 'expected_filename',
  'expectedfilename': 'expected_filename',
  'program id': 'program_id',
  'programid': 'program_id',
  'season id': 'season_id',
  'seasonid': 'season_id',
  'episode number': 'episode_number',
  'episodenumber': 'episode_number',
  'description': 'descriptive_summary_text',
  'summary': 'descriptive_summary_text',
  'synopsis': 'synopsis_text',
  'production year': 'production_year',
  'year': 'production_year',
  'duration': 'duration_seconds',
  'duration seconds': 'duration_seconds',
  'premium': 'is_premium_content',
  'is premium': 'is_premium_content',
  'featured': 'is_featured',
  'is featured': 'is_featured',
  'status': 'content_status',
  'rating': 'rating_system',
  'warning': 'content_warning',
  'language': 'original_language',
};

export class ExcelParser {
  /**
   * Parse Excel file and convert to MediaDescriptionCreate array
   */
  static async parseFile(file: File): Promise<ExcelParseResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Use the first sheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('No sheets found in Excel file');
      }
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { 
        raw: false, // Convert all values to strings initially
        defval: null 
      });
      
      return this.convertToMediaDescriptions(jsonData);
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Convert Excel rows to MediaDescription objects
   */
  private static convertToMediaDescriptions(rows: ExcelRow[]): ExcelParseResult {
    const data: MediaDescriptionCreate[] = [];
    const errors: { row: number; message: string }[] = [];
    
    rows.forEach((row, index) => {
      try {
        const description = this.convertRow(row, index + 2); // +2 because Excel is 1-indexed and has header row
        data.push(description);
      } catch (error) {
        errors.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    return { data, errors };
  }
  
  /**
   * Convert a single Excel row to MediaDescriptionCreate
   */
  private static convertRow(row: ExcelRow, rowNumber: number): MediaDescriptionCreate {
    const description: Partial<MediaDescriptionCreate> = {};
    
    // Map columns to description fields
    Object.entries(row).forEach(([excelColumn, value]) => {
      const normalizedColumn = excelColumn.toLowerCase().trim();
      const fieldName = COLUMN_MAPPING[normalizedColumn] || ALTERNATIVE_COLUMN_NAMES[normalizedColumn];
      
      if (fieldName && value !== null && value !== undefined && value !== '') {
        // Type conversion based on field type
        switch (fieldName) {
          case 'file_number':
          case 'episode_number':
          case 'production_year':
          case 'duration_seconds':
          case 'view_count':
          case 'like_count':
          case 'share_count':
          case 'translation_share':
          case 'sacem_share':
          case 'other_share':
          case 'revenue_share':
          case 'paid_token_cost':
            description[fieldName] = this.convertToNumber(value, fieldName, rowNumber);
            break;
          
          case 'is_premium_content':
          case 'is_featured':
            description[fieldName] = this.convertToBoolean(value);
            break;
          
          case 'media_type':
            description[fieldName] = this.validateMediaType(value, rowNumber);
            break;
          
          case 'content_status':
            description[fieldName] = this.validateContentStatus(value, rowNumber);
            break;
          
          case 'contract_start_date_utc':
          case 'contract_end_date_utc':
          case 'original_broadcast_date_utc':
            description[fieldName] = this.convertToISODate(value, fieldName, rowNumber);
            break;
          
          case 'media_categories_id_list':
          case 'themes_and_genres_id_list':
          case 'subscription_plan_id_list':
          case 'public_person_id_list':
          case 'subtitle_languages_available':
          case 'audio_languages_available':
          case 'seo_keywords':
          case 'social_media_hashtags':
          case 'distribution_territories':
          case 'actors_id_list':
          case 'directors_id_list':
          case 'productor_id_list':
          case 'authors_id_list':
          case 'origin_country_id_list':
          case 'original_languages_id':
          case 'available_countries_list':
          case 'eligible_plans':
          case 'audience_categories_id_list':
          case 'additional_images_id_list':
            description[fieldName] = this.convertToStringArray(value);
            break;
          
          default:
            description[fieldName] = String(value).trim();
            break;
        }
      }
    });
    
    // Validate required fields
    if (!description.file_number) {
      throw new Error('Missing required field: file_number');
    }
    if (!description.episode_title) {
      throw new Error('Missing required field: episode_title');
    }
    if (!description.media_type) {
      throw new Error('Missing required field: media_type');
    }
    
    return description as MediaDescriptionCreate;
  }
  
  /**
   * Convert value to number
   */
  private static convertToNumber(value: any, fieldName: string, _rowNumber: number): number {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Invalid number for ${fieldName}: ${value}`);
    }
    return num;
  }
  
  /**
   * Convert value to boolean
   */
  private static convertToBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    const strValue = String(value).toLowerCase().trim();
    return ['true', '1', 'yes', 'y'].includes(strValue);
  }
  
  /**
   * Validate media type
   */
  private static validateMediaType(value: any, _rowNumber: number): 'video' | 'webtoon' | 'trailer' | 'teaser' | 'excerpt' {
    const validTypes = ['video', 'webtoon', 'trailer', 'teaser', 'excerpt'];
    const mediaType = String(value).toLowerCase().trim();
    
    if (!validTypes.includes(mediaType)) {
      throw new Error(`Invalid media_type: ${value}. Must be one of: ${validTypes.join(', ')}`);
    }
    
    return mediaType as 'video' | 'webtoon' | 'trailer' | 'teaser' | 'excerpt';
  }
  
  /**
   * Validate content status
   */
  private static validateContentStatus(value: any, _rowNumber: number): 'draft' | 'published' | 'archived' | 'scheduled' {
    const validStatuses = ['draft', 'published', 'archived', 'scheduled'];
    const status = String(value).toLowerCase().trim();
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid content_status: ${value}. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    return status as 'draft' | 'published' | 'archived' | 'scheduled';
  }
  
  /**
   * Convert value to ISO date string
   */
  private static convertToISODate(value: any, fieldName: string, _rowNumber: number): string {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date for ${fieldName}: ${value}`);
      }
      return date.toISOString();
    } catch (error) {
      throw new Error(`Invalid date for ${fieldName}: ${value}`);
    }
  }
  
  /**
   * Convert value to string array (comma-separated)
   */
  private static convertToStringArray(value: any): string[] {
    if (Array.isArray(value)) return value.map(v => String(v).trim());
    
    const strValue = String(value).trim();
    if (!strValue) return [];
    
    return strValue.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }
  
  /**
   * Get template for Excel import
   */
  static generateTemplate(): Blob {
    const templateData = [
      {
        'file_number': 1001,
        'episode_title': 'Sample Episode',
        'media_type': 'video',
        'expected_filename': 'sample_episode.mp4',
        'episode_number': 1,
        'descriptive_summary_text': 'This is a sample episode description',
        'synopsis_text': 'Sample synopsis',
        'production_year': 2025,
        'duration_seconds': 3600,
        'is_premium_content': false,
        'is_featured': false,
        'content_status': 'draft',
        'original_language': 'en',
        'rating_system': 'PG',
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Media Descriptions');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}