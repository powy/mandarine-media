import { describe, it, expect } from 'vitest';
import { 
  Program, 
  Season, 
  Language, 
  Country, 
  Territory, 
  Picture,
  MediaDescription,
  PublicPerson,
  VideoFile,
  ProgramCreate,
  SeasonCreate,
  LanguageCreate,
  CountryCreate,
  TerritoryCreate,
  PictureCreate,
  PublicPersonCreate
} from '../types';

describe('v1.4 Types', () => {
  describe('Program', () => {
    it('should have correct Program interface structure', () => {
      const mockProgram: Program = {
        id: 'test-program-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        program_name: 'Test Program',
        general_media_description_id: 'test-media-desc-id'
      };

      expect(typeof mockProgram.id).toBe('string');
      expect(typeof mockProgram.creation_date_utc).toBe('string');
      expect(typeof mockProgram.program_name).toBe('string');
      expect(typeof mockProgram.general_media_description_id).toBe('string');
    });

    it('should allow optional description', () => {
      const minimalProgram: Program = {
        id: 'test-program-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        program_name: 'Test Program'
      };

      expect(minimalProgram.general_media_description_id).toBeUndefined();
    });

    it('should have correct ProgramCreate interface', () => {
      const createData: ProgramCreate = {
        program_name: 'New Program',
        general_media_description_id: 'new-media-desc-id'
      };

      expect(typeof createData.program_name).toBe('string');
      expect(typeof createData.general_media_description_id).toBe('string');
    });
  });

  describe('Season', () => {
    it('should have correct Season interface structure', () => {
      const mockSeason: Season = {
        id: 'test-season-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        program_id: 'test-program-id',
        season_number: 1
      };

      expect(typeof mockSeason.id).toBe('string');
      expect(typeof mockSeason.creation_date_utc).toBe('string');
      expect(typeof mockSeason.program_id).toBe('string');
      expect(typeof mockSeason.season_number).toBe('number');
    });

    it('should have correct SeasonCreate interface', () => {
      const createData: SeasonCreate = {
        program_id: 'test-program-id',
        season_number: 1
      };

      expect(typeof createData.program_id).toBe('string');
      expect(typeof createData.season_number).toBe('number');
    });
  });

  describe('Language', () => {
    it('should have correct Language interface structure', () => {
      const mockLanguage: Language = {
        id: 'test-language-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        name: 'Korean',
        sigle: 'ko'
      };

      expect(typeof mockLanguage.id).toBe('string');
      expect(typeof mockLanguage.creation_date_utc).toBe('string');
      expect(typeof mockLanguage.name).toBe('string');
      expect(typeof mockLanguage.sigle).toBe('string');
    });

    it('should have correct LanguageCreate interface', () => {
      const createData: LanguageCreate = {
        name: 'Korean',
        sigle: 'ko'
      };

      expect(typeof createData.name).toBe('string');
      expect(typeof createData.sigle).toBe('string');
    });
  });

  describe('Country', () => {
    it('should have correct Country interface structure', () => {
      const mockCountry: Country = {
        id: 'test-country-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        name: 'South Korea'
      };

      expect(typeof mockCountry.id).toBe('string');
      expect(typeof mockCountry.creation_date_utc).toBe('string');
      expect(typeof mockCountry.name).toBe('string');
    });

    it('should have correct CountryCreate interface', () => {
      const createData: CountryCreate = {
        name: 'South Korea'
      };

      expect(typeof createData.name).toBe('string');
    });
  });

  describe('Territory', () => {
    it('should have correct Territory interface structure', () => {
      const mockTerritory: Territory = {
        id: 'test-territory-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        name: 'Seoul Region',
        country_id: 'test-country-id'
      };

      expect(typeof mockTerritory.id).toBe('string');
      expect(typeof mockTerritory.creation_date_utc).toBe('string');
      expect(typeof mockTerritory.name).toBe('string');
      expect(typeof mockTerritory.country_id).toBe('string');
    });

    it('should allow optional country_id', () => {
      const territoryWithoutCountry: Territory = {
        id: 'test-territory-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        name: 'Independent Territory'
      };

      expect(territoryWithoutCountry.country_id).toBeUndefined();
    });

    it('should have correct TerritoryCreate interface', () => {
      const createData: TerritoryCreate = {
        name: 'Seoul Region',
        country_id: 'test-country-id'
      };

      expect(typeof createData.name).toBe('string');
      expect(typeof createData.country_id).toBe('string');
    });
  });

  describe('Picture', () => {
    it('should have correct Picture interface structure', () => {
      const mockPicture: Picture = {
        id: 'test-picture-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        image_url: 'https://example.com/image.jpg',
        file_name: 'image.jpg',
        file_size_bytes: 1024000,
        width: 1920,
        height: 1080,
        alt_text: 'Test image'
      };

      expect(typeof mockPicture.id).toBe('string');
      expect(typeof mockPicture.creation_date_utc).toBe('string');
      expect(typeof mockPicture.image_url).toBe('string');
      expect(typeof mockPicture.file_name).toBe('string');
      expect(typeof mockPicture.file_size_bytes).toBe('number');
      expect(typeof mockPicture.width).toBe('number');
      expect(typeof mockPicture.height).toBe('number');
      expect(typeof mockPicture.alt_text).toBe('string');
    });

    it('should allow optional metadata fields', () => {
      const minimalPicture: Picture = {
        id: 'test-picture-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        image_url: 'https://example.com/image.jpg'
      };

      expect(minimalPicture.file_name).toBeUndefined();
      expect(minimalPicture.file_size_bytes).toBeUndefined();
      expect(minimalPicture.width).toBeUndefined();
      expect(minimalPicture.height).toBeUndefined();
      expect(minimalPicture.alt_text).toBeUndefined();
    });

    it('should have correct PictureCreate interface', () => {
      const createData: PictureCreate = {
        image_url: 'https://example.com/image.jpg',
        file_name: 'image.jpg',
        file_size_bytes: 1024000,
        width: 1920,
        height: 1080,
        alt_text: 'Test image'
      };

      expect(typeof createData.image_url).toBe('string');
      expect(typeof createData.file_name).toBe('string');
      expect(typeof createData.file_size_bytes).toBe('number');
      expect(typeof createData.width).toBe('number');
      expect(typeof createData.height).toBe('number');
      expect(typeof createData.alt_text).toBe('string');
    });
  });

  describe('Updated MediaDescription v1.4', () => {
    it('should include new v1.4 fields', () => {
      const mockMediaDescription: MediaDescription = {
        id: 'test-media-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        file_number: 12345,
        episode_title: 'Test Episode',
        media_type: 'video',
        // v1.4 new fields
        actors_id_list: ['actor1', 'actor2'],
        directors_id_list: ['director1'],
        productor_id_list: ['producer1'],
        authors_id_list: ['author1'],
        origin_country_id_list: ['country1'],
        original_languages_id: ['lang1'],
        available_countries_list: ['country1', 'country2'],
        copyright_owner_id: 'owner1',
        eligible_plans: ['basic', 'premium'],
        audience_categories_id_list: ['category1'],
        image_fullscreen: 'https://example.com/fullscreen.jpg',
        image_thumbnail1: 'https://example.com/thumb1.jpg',
        image_thumbnail2: 'https://example.com/thumb2.jpg',
        image_thumbnail3: 'https://example.com/thumb3.jpg',
        image_thumbnail4: 'https://example.com/thumb4.jpg',
        image_thumbnail5: 'https://example.com/thumb5.jpg',
        image_thumbnail6: 'https://example.com/thumb6.jpg',
        image_thumbnail7: 'https://example.com/thumb7.jpg',
        image_thumbnail8: 'https://example.com/thumb8.jpg',
        image_thumbnail9: 'https://example.com/thumb9.jpg',
        image_thumbnail10: 'https://example.com/thumb10.jpg',
        translation_share: 15.5,
        sacem_share: 10.0,
        other_share: 5.0,
        revenue_share: 25.0,
        paid_token_cost: 2.50
      };

      expect(Array.isArray(mockMediaDescription.actors_id_list)).toBe(true);
      expect(Array.isArray(mockMediaDescription.directors_id_list)).toBe(true);
      expect(Array.isArray(mockMediaDescription.productor_id_list)).toBe(true);
      expect(Array.isArray(mockMediaDescription.authors_id_list)).toBe(true);
      expect(Array.isArray(mockMediaDescription.origin_country_id_list)).toBe(true);
      expect(Array.isArray(mockMediaDescription.original_languages_id)).toBe(true);
      expect(Array.isArray(mockMediaDescription.available_countries_list)).toBe(true);
      expect(Array.isArray(mockMediaDescription.eligible_plans)).toBe(true);
      expect(Array.isArray(mockMediaDescription.audience_categories_id_list)).toBe(true);
      
      expect(typeof mockMediaDescription.copyright_owner_id).toBe('string');
      expect(typeof mockMediaDescription.image_fullscreen).toBe('string');
      expect(typeof mockMediaDescription.image_thumbnail1).toBe('string');
      
      expect(typeof mockMediaDescription.translation_share).toBe('number');
      expect(typeof mockMediaDescription.sacem_share).toBe('number');
      expect(typeof mockMediaDescription.other_share).toBe('number');
      expect(typeof mockMediaDescription.revenue_share).toBe('number');
      expect(typeof mockMediaDescription.paid_token_cost).toBe('number');
    });

    it('should allow all v1.4 fields to be optional', () => {
      const minimalMediaDescription: MediaDescription = {
        id: 'test-media-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        file_number: 12345,
        episode_title: 'Test Episode',
        media_type: 'video'
      };

      expect(minimalMediaDescription.actors_id_list).toBeUndefined();
      expect(minimalMediaDescription.directors_id_list).toBeUndefined();
      expect(minimalMediaDescription.image_fullscreen).toBeUndefined();
      expect(minimalMediaDescription.translation_share).toBeUndefined();
    });
  });

  describe('Updated PublicPerson v1.5', () => {
    it('should have required stage_name_roman field', () => {
      const mockPublicPerson: PublicPerson = {
        id: 'test-person-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        stage_name_roman: 'Kim Chul-soo', // v1.5 required field
        first_name_hangul: '김',
        last_name_hangul: '철수',
        first_name_roman: 'Chul',
        last_name_roman: 'Kim',
        stage_name_hangul: '김철수',
        profession_list: ['actor', 'singer'],
        face_image_id: 'face-image-id'
      };

      expect(typeof mockPublicPerson.stage_name_roman).toBe('string'); // v1.5 required field
      expect(typeof mockPublicPerson.first_name_hangul).toBe('string');
      expect(typeof mockPublicPerson.last_name_hangul).toBe('string');
      expect(typeof mockPublicPerson.first_name_roman).toBe('string');
      expect(typeof mockPublicPerson.last_name_roman).toBe('string');
      expect(typeof mockPublicPerson.stage_name_hangul).toBe('string');
      expect(Array.isArray(mockPublicPerson.profession_list)).toBe(true);
      expect(typeof mockPublicPerson.face_image_id).toBe('string');
    });

    it('should allow optional name fields except stage_name_roman', () => {
      const minimalPublicPerson: PublicPerson = {
        id: 'test-person-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        stage_name_roman: 'Kim Chul-soo' // Only required field in v1.5
      };

      expect(typeof minimalPublicPerson.stage_name_roman).toBe('string');
      expect(minimalPublicPerson.first_name_hangul).toBeUndefined();
      expect(minimalPublicPerson.last_name_hangul).toBeUndefined();
      expect(minimalPublicPerson.first_name_roman).toBeUndefined();
      expect(minimalPublicPerson.last_name_roman).toBeUndefined();
      expect(minimalPublicPerson.stage_name_hangul).toBeUndefined();
      expect(minimalPublicPerson.profession_list).toBeUndefined();
      expect(minimalPublicPerson.face_image_id).toBeUndefined();
    });

    it('should handle null values properly for optional fields', () => {
      const personWithNullValues: PublicPerson = {
        id: 'test-person-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        stage_name_roman: 'Kim Chul-soo',
        first_name_hangul: null,
        last_name_hangul: null,
        first_name_roman: null,
        last_name_roman: null,
        stage_name_hangul: null,
        profession_list: null,
        face_image_id: null
      };

      expect(personWithNullValues.first_name_hangul).toBeNull();
      expect(personWithNullValues.profession_list).toBeNull();
      expect(personWithNullValues.face_image_id).toBeNull();
    });

    it('should have correct PublicPersonCreate interface', () => {
      const createData: PublicPersonCreate = {
        stage_name_roman: 'Kim Chul-soo', // v1.5 required field
        first_name_hangul: '김',
        last_name_hangul: '철수',
        first_name_roman: 'Chul',
        last_name_roman: 'Kim',
        stage_name_hangul: '김철수',
        profession_list: ['actor', 'singer'],
        face_image_id: 'face-image-id'
      };

      expect(typeof createData.stage_name_roman).toBe('string');
      expect(typeof createData.first_name_hangul).toBe('string');
      expect(typeof createData.last_name_hangul).toBe('string');
      expect(typeof createData.first_name_roman).toBe('string');
      expect(typeof createData.last_name_roman).toBe('string');
      expect(typeof createData.stage_name_hangul).toBe('string');
      expect(Array.isArray(createData.profession_list)).toBe(true);
      expect(typeof createData.face_image_id).toBe('string');
    });
  });

  describe('Updated VideoFile v1.4', () => {
    it('should have new v1.4 language fields', () => {
      const mockVideoFile: VideoFile = {
        id: 'test-video-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        file_name: 'test.mp4',
        encoding_status: 'completed',
        upload_method: 'new_upload',
        upload_status: 'upload_completed',
        // v1.4 new fields
        subtitle_languages_id_list: ['lang1', 'lang2'],
        audio_languages_id_list: ['lang1'],
        resolutions_id_list: ['1080p', '720p'],
        accessibilities_id_list: ['subtitles', 'audio_description']
      };

      expect(Array.isArray(mockVideoFile.subtitle_languages_id_list)).toBe(true);
      expect(Array.isArray(mockVideoFile.audio_languages_id_list)).toBe(true);
      expect(Array.isArray(mockVideoFile.resolutions_id_list)).toBe(true);
      expect(Array.isArray(mockVideoFile.accessibilities_id_list)).toBe(true);
    });

    it('should allow file_name to be optional', () => {
      const videoFileWithoutName: VideoFile = {
        id: 'test-video-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        encoding_status: 'completed',
        upload_method: 'existing_url',
        upload_status: 'upload_completed'
      };

      expect(videoFileWithoutName.file_name).toBeUndefined();
    });

    it('should allow all v1.4 fields to be optional', () => {
      const minimalVideoFile: VideoFile = {
        id: 'test-video-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        encoding_status: 'completed',
        upload_method: 'new_upload',
        upload_status: 'upload_completed'
      };

      expect(minimalVideoFile.subtitle_languages_id_list).toBeUndefined();
      expect(minimalVideoFile.audio_languages_id_list).toBeUndefined();
      expect(minimalVideoFile.resolutions_id_list).toBeUndefined();
      expect(minimalVideoFile.accessibilities_id_list).toBeUndefined();
    });
  });
});