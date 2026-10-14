import { describe, it, expect } from 'vitest';
import { transformSeasonJSON } from '../utils/seasonAdapters';
import type { SeasonJSON, SeasonEpisodeItemJSON } from '../types';

describe('seasonAdapters', () => {
  describe('transformSeasonJSON', () => {
    it('should transform complete season JSON with general_description', () => {
      const mockGeneralDescription: SeasonEpisodeItemJSON = {
        id: 'desc-1',
        title: 'Season 1',
        media_type: 'season',
        friendly_url: '/seasons/test-season',
        slug: 'test-season-1',
        media_categories_list: ['drama', 'thriller'],
        descriptive_summary_text: 'An exciting first season',
        is_featured: true,
        program_id: 'prog-1',
        season_id: 'season-1',
        episode_number: undefined,
        episode_order: 0,
        image_1920_1080_url: 'https://example.com/season-image.jpg',
        image_1920_720_url: 'https://example.com/season-image.jpg',
        image_1080_1080_url: undefined,
        image_810_1080_url: undefined,
        image_1080_1920_url: undefined
      };

      const mockEpisodes: SeasonEpisodeItemJSON[] = [
        {
          id: 'ep-1',
          title: 'Episode 1',
          media_type: 'video',
          is_featured: false,
          episode_number: 1,
          episode_order: 1,
          image_1920_1080_url: 'https://example.com/ep1.jpg'
        },
        {
          id: 'ep-2',
          title: 'Episode 2',
          media_type: 'video',
          is_featured: false,
          episode_number: 2,
          episode_order: 2,
          image_1920_1080_url: 'https://example.com/ep2.jpg'
        }
      ] as SeasonEpisodeItemJSON[];

      const mockSeasonJSON: SeasonJSON = {
        id: 'season-1',
        season_number: 1,
        season_name: 'Season One',
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        episode_count: 2,
        general_description: mockGeneralDescription,
        episodes: mockEpisodes
      };

      const result = transformSeasonJSON(mockSeasonJSON);

      expect(result.season.id).toBe('season-1');
      expect(result.season.season_number).toBe(1);
      expect(result.season.season_name).toBe('Season One');
      expect(result.season.program_id).toBe('prog-1');
      expect(result.seasonImageUrl).toBe('https://example.com/season-image.jpg');
      expect(result.synopsis).toBe('An exciting first season');
      expect(result.description).toBe('An exciting first season');
      expect(result.genres).toEqual(['drama', 'thriller']);
      expect(result.episodes).toHaveLength(2);
      expect(result.episodeCount).toBe(2);
      expect(result.episodes[0].episode_title).toBe('Episode 1');
      expect(result.episodes[1].episode_title).toBe('Episode 2');
    });

    it('should fallback to first episode when no general_description', () => {
      const mockEpisodes: SeasonEpisodeItemJSON[] = [
        {
          id: 'ep-1',
          title: 'First Episode',
          media_type: 'video',
          is_featured: false,
          episode_number: 1,
          episode_order: 1,
          media_categories_list: ['comedy'],
          descriptive_summary_text: 'A funny first episode',
          image_1920_1080_url: 'https://example.com/ep1.jpg',
          image_1920_720_url: 'https://example.com/ep1.jpg'
        }
      ] as SeasonEpisodeItemJSON[];

      const mockSeasonJSON: SeasonJSON = {
        id: 'season-1',
        season_number: 1,
        season_name: undefined,
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        episode_count: 1,
        general_description: undefined, // No season-level description
        episodes: mockEpisodes
      };

      const result = transformSeasonJSON(mockSeasonJSON);

      expect(result.synopsis).toBe('A funny first episode');
      expect(result.description).toBe('A funny first episode');
      expect(result.genres).toEqual(['comedy']);
      expect(result.seasonImageUrl).toBe('https://example.com/ep1.jpg');
    });

    it('should handle season with no episodes', () => {
      const mockSeasonJSON: SeasonJSON = {
        id: 'season-1',
        season_number: 1,
        season_name: 'Empty Season',
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        episode_count: 0,
        general_description: undefined,
        episodes: []
      };

      const result = transformSeasonJSON(mockSeasonJSON);

      expect(result.season.id).toBe('season-1');
      expect(result.season.season_number).toBe(1);
      expect(result.seasonImageUrl).toBeNull();
      expect(result.synopsis).toBeNull();
      expect(result.description).toBeNull();
      expect(result.genres).toEqual([]);
      expect(result.episodes).toEqual([]);
      expect(result.episodeCount).toBe(0);
    });

    it('should handle null/undefined optional fields gracefully', () => {
      const mockEpisode: SeasonEpisodeItemJSON = {
        id: 'ep-1',
        title: 'Episode 1',
        media_type: 'video',
        is_featured: false,
        episode_number: undefined, // Undefined episode number
        episode_order: 1,
        image_1920_1080_url: undefined // No image
      } as SeasonEpisodeItemJSON;

      const mockSeasonJSON: SeasonJSON = {
        id: 'season-1',
        season_number: 1,
        season_name: undefined,
        program_id: undefined,
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        episode_count: 1,
        general_description: undefined,
        episodes: [mockEpisode]
      };

      const result = transformSeasonJSON(mockSeasonJSON);

      expect(result.season.season_name).toBeNull();
      expect(result.season.program_id).toBeNull();
      expect(result.episodes[0].episode_number).toBeNull();
      expect(result.episodes[0].image_1920_1080_url).toBeNull();
      expect(result.seasonImageUrl).toBeNull();
    });

    it('should correctly map episodes with all required fields', () => {
      const mockEpisodes: SeasonEpisodeItemJSON[] = [
        {
          id: 'ep-1',
          title: 'Pilot',
          media_type: 'video',
          is_featured: false,
          episode_number: 1,
          episode_order: 1,
          image_1920_1080_url: 'https://example.com/pilot.jpg'
        },
        {
          id: 'ep-2',
          title: 'Second Episode',
          media_type: 'video',
          is_featured: true,
          episode_number: 2,
          episode_order: 2,
          image_1920_1080_url: 'https://example.com/ep2.jpg'
        }
      ] as SeasonEpisodeItemJSON[];

      const mockSeasonJSON: SeasonJSON = {
        id: 'season-1',
        season_number: 1,
        season_name: undefined,
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        episode_count: 2,
        general_description: undefined,
        episodes: mockEpisodes
      };

      const result = transformSeasonJSON(mockSeasonJSON);

      expect(result.episodes).toHaveLength(2);

      // First episode
      expect(result.episodes[0].id).toBe('ep-1');
      expect(result.episodes[0].episode_title).toBe('Pilot');
      expect(result.episodes[0].episode_number).toBe(1);
      expect(result.episodes[0].image_1920_1080_url).toBe('https://example.com/pilot.jpg');
      expect(result.episodes[0].duration_seconds).toBeUndefined();

      // Second episode
      expect(result.episodes[1].id).toBe('ep-2');
      expect(result.episodes[1].episode_title).toBe('Second Episode');
      expect(result.episodes[1].episode_number).toBe(2);
      expect(result.episodes[1].image_1920_1080_url).toBe('https://example.com/ep2.jpg');
      expect(result.episodes[1].duration_seconds).toBeUndefined();
    });

    it('should use first episode image for seasonImageUrl when general_description has no image', () => {
      const mockGeneralDescription: SeasonEpisodeItemJSON = {
        id: 'desc-1',
        title: 'Season 1',
        media_type: 'season',
        is_featured: false,
        episode_number: undefined,
        episode_order: 0,
        media_categories_list: ['action'],
        descriptive_summary_text: 'Action-packed season',
        image_1920_1080_url: undefined // No image in general_description
      };

      const mockEpisodes: SeasonEpisodeItemJSON[] = [
        {
          id: 'ep-1',
          title: 'First Episode',
          media_type: 'video',
          is_featured: false,
          episode_number: 1,
          episode_order: 1,
          image_1920_1080_url: 'https://example.com/ep1-fallback.jpg',
          image_1920_720_url: 'https://example.com/ep1-fallback.jpg'
        }
      ] as SeasonEpisodeItemJSON[];

      const mockSeasonJSON: SeasonJSON = {
        id: 'season-1',
        season_number: 1,
        season_name: undefined,
        program_id: 'prog-1',
        creation_date_utc: '2024-01-01T00:00:00Z',
        last_updated: '2024-01-15T00:00:00Z',
        episode_count: 1,
        general_description: mockGeneralDescription,
        episodes: mockEpisodes
      };

      const result = transformSeasonJSON(mockSeasonJSON);

      // Should use episode image as fallback
      expect(result.seasonImageUrl).toBe('https://example.com/ep1-fallback.jpg');
      // But should still use general_description data
      expect(result.synopsis).toBe('Action-packed season');
      expect(result.genres).toEqual(['action']);
    });
  });
});
