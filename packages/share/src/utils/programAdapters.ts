import type { ProgramJSON } from '../types';

/**
 * Program data transformation utilities
 * Converts JSON cache data to display-ready formats for UI components
 */

export interface TransformedProgramData {
  program: {
    id: string;
    program_name: string;
  };
  programImageUrl: string | null;
  synopsis: string | null;
  description: string | null;
  genres: string[];
  releaseDate: number | null;
  allSeasons: Array<{
    id: string;
    season_number: number;
    episodeCount: number;
    thumbnailUrl: string | null;
    summaryText: string | null;
  }>;
}

/**
 * Transform ProgramJSON from cache to display-ready format
 *
 * This adapter extracts and formats program data from the JSON cache,
 * including program metadata, seasons list, and episode counts.
 *
 * Data sources (fallback hierarchy):
 * 1. Program's general_description (if exists)
 * 2. First season's general_description (fallback)
 * 3. First episode of first season (final fallback)
 *
 * @param json - ProgramJSON from cache
 * @returns Transformed data ready for display components
 */
export function transformProgramJSON(json: ProgramJSON): TransformedProgramData {
  // Extract program basic info
  const program = {
    id: json.id,
    program_name: json.program_name
  };

  // Initialize display variables
  let programImageUrl: string | null = null;
  let synopsis: string | null = null;
  let description: string | null = null;
  let genres: string[] = [];
  let releaseDate: number | null = null;

  // Try to get metadata from program's general_description first
  if (json.general_description) {
    synopsis = json.general_description.descriptive_summary_text || null;
    description = synopsis; // Use same field for both
    genres = json.general_description.media_categories_list || [];
    programImageUrl = json.general_description.image_1920_720_url || null;
  }

  // Fallback to first season's general_description if program has no general_description
  if (!synopsis && !description && genres.length === 0 && json.seasons.length > 0) {
    const firstSeason = json.seasons[0];
    if (firstSeason.general_description) {
      synopsis = firstSeason.general_description.descriptive_summary_text || null;
      description = synopsis;
      genres = firstSeason.general_description.media_categories_list || [];
      programImageUrl = programImageUrl || firstSeason.general_description.image_1920_720_url || null;
    }
  }

  // Final fallback to first episode of first season
  if (!synopsis && !description && genres.length === 0 && json.seasons.length > 0) {
    const firstSeason = json.seasons[0];
    if (firstSeason.episodes.length > 0) {
      const firstEpisode = firstSeason.episodes[0];
      synopsis = firstEpisode.descriptive_summary_text || null;
      description = synopsis;
      genres = firstEpisode.media_categories_list || [];
      programImageUrl = programImageUrl || firstEpisode.image_1920_720_url || null;
    }
  }

  // Transform seasons data for display
  const allSeasons = json.seasons.map(season => {
    // Get thumbnail from first episode of the season
    let thumbnailUrl: string | null = null;
    if (season.episodes.length > 0) {
      thumbnailUrl = season.episodes[0].image_1920_1080_url || null;
    }

    // Get summary text with fallback hierarchy
    let summaryText: string | null = null;
    if (season.general_description?.descriptive_summary_text) {
      summaryText = season.general_description.descriptive_summary_text;
    } else if (season.episodes.length > 0) {
      summaryText = season.episodes[0].descriptive_summary_text || null;
    }

    return {
      id: season.id,
      season_number: season.season_number,
      episodeCount: season.episode_count,
      thumbnailUrl,
      summaryText
    };
  });

  return {
    program,
    programImageUrl,
    synopsis,
    description,
    genres: genres || [],
    releaseDate,
    allSeasons
  };
}
