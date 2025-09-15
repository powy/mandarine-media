import type { MediaShowcaseItem, ContentListItem } from '../types';

/**
 * Navigation utilities for routing decisions
 * Centralizes the logic for determining routes based on media types
 */

/**
 * Get the route path for a media showcase item based on its media type
 */
export const getMediaShowcaseItemRoute = (item: MediaShowcaseItem): string => {
  switch (item.media_type) {
    case 'media_description':
      return `/video/${item.id}`;
    case 'program':
      return `/program/${item.id}`;
    case 'season':
      return `/season/${item.id}`;
    default:
      console.warn('Unknown media_type for showcase item:', item.media_type);
      return `/video/${item.id}`; // fallback to video route
  }
};

/**
 * Get the route path for a content list item based on its content type
 */
export const getContentListItemRoute = (item: ContentListItem): string => {
  switch (item.content_type) {
    case 'media_description':
      return `/video/${item.content_id}`;
    case 'program':
      return `/program/${item.content_id}`;
    case 'season':
      return `/season/${item.content_id}`;
    default:
      console.warn('Unknown content_type for content list item:', item.content_type);
      return `/video/${item.content_id}`; // fallback to video route
  }
};

/**
 * Get the route path for a season click
 */
export const getSeasonRoute = (seasonId: string): string => {
  return `/season/${seasonId}`;
};

/**
 * Get the route path for a program click
 */
export const getProgramRoute = (programId: string): string => {
  return `/program/${programId}`;
};

/**
 * Get the route path for a video/media description click
 */
export const getVideoRoute = (videoId: string): string => {
  return `/video/${videoId}`;
};

/**
 * Navigation action types for type safety
 */
export type NavigationAction = {
  type: 'navigate';
  path: string;
};

/**
 * Create a navigation action for a media showcase item
 */
export const createMediaShowcaseNavigationAction = (item: MediaShowcaseItem): NavigationAction => {
  return {
    type: 'navigate',
    path: getMediaShowcaseItemRoute(item),
  };
};

/**
 * Create a navigation action for a content list item
 */
export const createContentListNavigationAction = (item: ContentListItem): NavigationAction => {
  return {
    type: 'navigate',
    path: getContentListItemRoute(item),
  };
};