import type { PublicPerson, Language, Country } from '../types';

/**
 * Data processing utilities for display formatting
 * Centralizes common formatting logic used across components
 */

/**
 * Format person names for display
 * Uses stage name if available, otherwise combines first and last names
 */
export const formatPersonName = (person: PublicPerson): string => {
  if (person.stage_name_roman) {
    return person.stage_name_roman;
  }

  const firstName = person.first_name_roman || '';
  const lastName = person.last_name_roman || '';

  return `${firstName} ${lastName}`.trim() || 'Unknown';
};

/**
 * Format a list of persons into a comma-separated string
 */
export const formatPersonsList = (persons: (PublicPerson | null)[]): string => {
  return persons.filter(Boolean).map(formatPersonName).join(', ');
};

/**
 * Format a list of languages into a comma-separated string
 */
export const formatLanguagesList = (languages: (Language | null)[]): string => {
  return languages.filter(Boolean).map(lang => lang!.name).join(', ');
};

/**
 * Format a list of countries into a comma-separated string
 */
export const formatCountriesList = (countries: (Country | null)[]): string => {
  return countries.filter(Boolean).map(country => country!.name).join(', ');
};

/**
 * Format a list of genres into a comma-separated string
 */
export const formatGenresList = (genres: string[]): string => {
  return genres.join(', ');
};

/**
 * Calculate thumbnail dimensions based on percentage and base width
 */
export const calculateThumbnailDimensions = (
  widthPercentage: number,
  heightPercentage: number,
  baseWidth: number = 300
): { width: number; height: number } => {
  const width = Math.round((widthPercentage / 100) * baseWidth);
  const height = Math.round((heightPercentage / 100) * baseWidth);
  return { width, height };
};

/**
 * Format episode count for display
 */
export const formatEpisodeCount = (count: number): string => {
  return `${count} épisode${count > 1 ? 's' : ''}`;
};

/**
 * Format season display text
 */
export const formatSeasonTitle = (seasonNumber: number): string => {
  return `Saison ${seasonNumber}`;
};

/**
 * Format crew role display with proper pluralization
 */
export const formatCrewRole = (role: string, count: number): string => {
  const roleMap: Record<string, string> = {
    'producer': 'Producteur',
    'director': 'Réalisateur',
    'actor': 'acteur'
  };

  const roleName = roleMap[role] || role;
  return count > 1 ? `${roleName}s` : roleName;
};

/**
 * Sort items by display order
 */
export const sortByDisplayOrder = <T extends { display_order: number }>(items: T[]): T[] => {
  return [...items].sort((a, b) => a.display_order - b.display_order);
};

/**
 * Check if a URL is valid
 */
export const isValidUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get fallback image dimensions
 */
export const getFallbackImageDimensions = (): { width: number; height: number } => {
  return { width: 128, height: 128 };
};