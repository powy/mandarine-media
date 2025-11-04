import { describe, it, expect } from 'vitest';
import { transformProgramJSON } from '../utils/programAdapters';
import type { ProgramJSON, SeasonJSON, SeasonEpisodeItemJSON } from '../types';

describe('programAdapters', () => {
  describe('transformProgramJSON', () => {
    it('should transform complete program JSON with general_description', () => {
      const mockGeneralDescription: SeasonEpisodeItemJSON = {
        id: 'desc-1',
        title: 'Program Title',
        media_type: 'program',
        friendly_url: '/programs/test-program',
        slug: 'test-program',
        media_categories_list: ['drama', 'action'],
        descriptive_summary_text: 'A great program about heroes',
        is_featured: true,
        program_id: 'prog-1',
        season_id: undefined,
        episode_number: undefined,
        episode_order: 0,
        image_1920_1080_url: 'https://example.com/program-image.jpg',
        image_1920_720_url: undefined,
        image_1080_1080_url: undefined,
        image_810_1080_url: undefined,
        image_1080_1920_url: undefined
      };

      const mockSeason: SeasonJSON = {
        id: 'season-1',
        season_number: 1,
        season_name: 'Season 1',
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        episode_count: 10,
        general_description: undefined,
        episodes: [
          {
            id: 'ep-1',
            title: 'Episode 1',
            media_type: 'video',
            is_featured: false,
            episode_number: 1,
            episode_order: 1,
            image_1920_1080_url: 'https://example.com/ep1.jpg'
          } as SeasonEpisodeItemJSON
        ]
      };

      const mockProgramJSON: ProgramJSON = {
        id: 'prog-1',
        program_name: 'Test Program',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        season_count: 1,
        general_description: mockGeneralDescription,
        seasons: [mockSeason]
      };

      const result = transformProgramJSON(mockProgramJSON);

      expect(result.program.id).toBe('prog-1');
      expect(result.program.program_name).toBe('Test Program');
      expect(result.programImageUrl).toBe('https://example.com/program-image.jpg');
      expect(result.synopsis).toBe('A great program about heroes');
      expect(result.description).toBe('A great program about heroes');
      expect(result.genres).toEqual(['drama', 'action']);
      expect(result.allSeasons).toHaveLength(1);
      expect(result.allSeasons[0].season_number).toBe(1);
      expect(result.allSeasons[0].episodeCount).toBe(10);
      expect(result.allSeasons[0].thumbnailUrl).toBe('https://example.com/ep1.jpg');
    });

    it('should fallback to season general_description when program has no general_description', () => {
      const mockSeasonDesc: SeasonEpisodeItemJSON = {
        id: 'desc-2',
        title: 'Season 1',
        media_type: 'season',
        is_featured: false,
        episode_number: undefined,
        episode_order: 0,
        media_categories_list: ['comedy'],
        descriptive_summary_text: 'Funny season description',
        image_1920_1080_url: 'https://example.com/season-image.jpg'
      };

      const mockSeason: SeasonJSON = {
        id: 'season-1',
        season_number: 1,
        season_name: undefined,
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        episode_count: 5,
        general_description: mockSeasonDesc,
        episodes: []
      };

      const mockProgramJSON: ProgramJSON = {
        id: 'prog-1',
        program_name: 'Test Program',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        season_count: 1,
        general_description: undefined, // No program-level description
        seasons: [mockSeason]
      };

      const result = transformProgramJSON(mockProgramJSON);

      expect(result.synopsis).toBe('Funny season description');
      expect(result.description).toBe('Funny season description');
      expect(result.genres).toEqual(['comedy']);
      expect(result.programImageUrl).toBe('https://example.com/season-image.jpg');
    });

    it('should fallback to first episode when no other description available', () => {
      const mockEpisode: SeasonEpisodeItemJSON = {
        id: 'ep-1',
        title: 'First Episode',
        media_type: 'video',
        is_featured: false,
        episode_number: 1,
        episode_order: 1,
        media_categories_list: ['thriller'],
        descriptive_summary_text: 'Episode description',
        image_1920_1080_url: 'https://example.com/episode.jpg'
      };

      const mockSeason: SeasonJSON = {
        id: 'season-1',
        season_number: 1,
        season_name: undefined,
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        episode_count: 1,
        general_description: undefined, // No season description
        episodes: [mockEpisode]
      };

      const mockProgramJSON: ProgramJSON = {
        id: 'prog-1',
        program_name: 'Test Program',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        season_count: 1,
        general_description: undefined, // No program description
        seasons: [mockSeason]
      };

      const result = transformProgramJSON(mockProgramJSON);

      expect(result.synopsis).toBe('Episode description');
      expect(result.description).toBe('Episode description');
      expect(result.genres).toEqual(['thriller']);
      expect(result.programImageUrl).toBe('https://example.com/episode.jpg');
    });

    it('should handle program with no seasons', () => {
      const mockProgramJSON: ProgramJSON = {
        id: 'prog-1',
        program_name: 'Empty Program',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        season_count: 0,
        general_description: undefined,
        seasons: []
      };

      const result = transformProgramJSON(mockProgramJSON);

      expect(result.program.id).toBe('prog-1');
      expect(result.program.program_name).toBe('Empty Program');
      expect(result.programImageUrl).toBeNull();
      expect(result.synopsis).toBeNull();
      expect(result.description).toBeNull();
      expect(result.genres).toEqual([]);
      expect(result.allSeasons).toEqual([]);
    });

    it('should handle null/undefined optional fields gracefully', () => {
      const mockSeason: SeasonJSON = {
        id: 'season-1',
        season_number: 1,
        season_name: undefined,
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        episode_count: 0,
        general_description: undefined,
        episodes: []
      };

      const mockProgramJSON: ProgramJSON = {
        id: 'prog-1',
        program_name: 'Test Program',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        season_count: 1,
        general_description: undefined,
        seasons: [mockSeason]
      };

      const result = transformProgramJSON(mockProgramJSON);

      expect(result).toBeDefined();
      expect(result.programImageUrl).toBeNull();
      expect(result.synopsis).toBeNull();
      expect(result.description).toBeNull();
      expect(result.genres).toEqual([]);
    });

    it('should extract thumbnail from first episode of each season', () => {
      const season1: SeasonJSON = {
        id: 'season-1',
        season_number: 1,
        season_name: undefined,
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        episode_count: 2,
        general_description: undefined,
        episodes: [
          {
            id: 'ep-1',
            title: 'S1E1',
            media_type: 'video',
            is_featured: false,
            episode_number: 1,
            episode_order: 1,
            image_1920_1080_url: 'https://example.com/s1e1.jpg'
          } as SeasonEpisodeItemJSON,
          {
            id: 'ep-2',
            title: 'S1E2',
            media_type: 'video',
            is_featured: false,
            episode_number: 2,
            episode_order: 2,
            image_1920_1080_url: 'https://example.com/s1e2.jpg'
          } as SeasonEpisodeItemJSON
        ]
      };

      const season2: SeasonJSON = {
        id: 'season-2',
        season_number: 2,
        season_name: undefined,
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        episode_count: 1,
        general_description: undefined,
        episodes: [
          {
            id: 'ep-3',
            title: 'S2E1',
            media_type: 'video',
            is_featured: false,
            episode_number: 1,
            episode_order: 1,
            image_1920_1080_url: 'https://example.com/s2e1.jpg'
          } as SeasonEpisodeItemJSON
        ]
      };

      const mockProgramJSON: ProgramJSON = {
        id: 'prog-1',
        program_name: 'Multi-Season Program',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        season_count: 2,
        general_description: undefined,
        seasons: [season1, season2]
      };

      const result = transformProgramJSON(mockProgramJSON);

      expect(result.allSeasons).toHaveLength(2);
      expect(result.allSeasons[0].thumbnailUrl).toBe('https://example.com/s1e1.jpg');
      expect(result.allSeasons[1].thumbnailUrl).toBe('https://example.com/s2e1.jpg');
    });
  });
});
