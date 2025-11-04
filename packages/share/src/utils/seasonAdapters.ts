import type { SeasonJSON } from '../types';

/**
 * Season data transformation utilities
 * Converts JSON cache data to display-ready formats for UI components
 */

export interface TransformedSeasonEpisode {
  id: string;
  episode_title: string;
  episode_number: number | null;
  duration_seconds?: number;
  image_1920_1080_url: string | null;
  descriptive_summary_text?: string;
}

export interface TransformedSeasonData {
  season: {
    id: string;
    season_number: number;
    season_name: string | null;
    program_id: string | null;
  };
  seasonImageUrl: string | null;
  synopsis: string | null;
  description: string | null;
  genres: string[];
  releaseDate: number | null;
  episodes: TransformedSeasonEpisode[];
  episodeCount: number;
}

/**
 * Transform SeasonJSON from cache to display-ready format
 *
 * This adapter extracts and formats season data from the JSON cache,
 * including season metadata, episodes list, and thumbnails.
 *
 * Data sources (fallback hierarchy):
 * 1. Season's general_description (if exists)
 * 2. First episode (fallback)
 *
 * @param json - SeasonJSON from cache
 * @returns Transformed data ready for display components
 */
export function transformSeasonJSON(json: SeasonJSON): TransformedSeasonData {
  // Extract season basic info
  const season = {
    id: json.id,
    season_number: json.season_number,
    season_name: json.season_name || null,
    program_id: json.program_id || null
  };

  // Initialize display variables
  let seasonImageUrl: string | null = null;
  let synopsis: string | null = null;
  let description: string | null = null;
  let genres: string[] = [];
  let releaseDate: number | null = null;

  // Try to get metadata from season's general_description first
  if (json.general_description) {
    synopsis = json.general_description.descriptive_summary_text || null;
    description = synopsis; // Use same field for both
    genres = json.general_description.media_categories_list || [];
    seasonImageUrl = json.general_description.image_1920_720_url || null;
  }

  // Fallback to first episode if season has no general_description
  if (!synopsis && !description && genres.length === 0 && json.episodes.length > 0) {
    const firstEpisode = json.episodes[0];
    synopsis = firstEpisode.descriptive_summary_text || null;
    description = synopsis;
    genres = firstEpisode.media_categories_list || [];
    seasonImageUrl = seasonImageUrl || firstEpisode.image_1920_720_url || null;
  }

  // If still no seasonImageUrl, use first episode's image
  if (!seasonImageUrl && json.episodes.length > 0) {
    seasonImageUrl = json.episodes[0].image_1920_720_url || null;
  }

  // Transform episodes data for display
  const episodes = json.episodes.map(ep => ({
    id: ep.id,
    episode_title: ep.title,
    episode_number: ep.episode_number || null,
    duration_seconds: undefined, // Not available in JSON cache
    image_1920_1080_url: ep.image_1920_1080_url || null,
    descriptive_summary_text: ep.descriptive_summary_text || null
  }));

  return {
    season,
    seasonImageUrl,
    synopsis,
    description,
    genres: genres || [],
    releaseDate,
    episodes,
    episodeCount: json.episode_count
  };
}
