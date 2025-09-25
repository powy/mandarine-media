import { mediaApi } from '../api/media';
import type { MediaDescription } from '../types';

export interface MediaDescriptionResolution {
  isMediaDescription: boolean;
  mediaType?: 'program' | 'season' | 'video' | 'trailer' | 'excerpt' | 'webtoon';
  resolvedId?: string;
  mediaDescription?: MediaDescription;
  redirectPath?: string;
}

/**
 * Checks if an ID is a MediaDescription ID and resolves it to the appropriate entity ID
 */
export const resolveMediaDescriptionId = async (id: string): Promise<MediaDescriptionResolution> => {
  try {
    console.log('🔍 MediaDescription Resolver: Checking ID:', id);

    // Try to fetch as MediaDescription first
    const mediaDescription = await mediaApi.getMediaDescription(id);
    console.log('✅ MediaDescription Resolver: Found MediaDescription:', {
      id: mediaDescription.id,
      mediaType: mediaDescription.media_type,
      programId: mediaDescription.program_id,
      seasonId: mediaDescription.season_id
    });

    // Determine the redirect path based on media type
    let redirectPath: string | undefined;
    let resolvedId: string | undefined;

    switch (mediaDescription.media_type) {
      case 'program':
        // For program MediaDescriptions, use the program_id
        if (mediaDescription.program_id) {
          resolvedId = mediaDescription.program_id;
          redirectPath = `/program/${mediaDescription.program_id}`;
        }
        break;

      case 'season':
        // For season MediaDescriptions, use the season_id
        if (mediaDescription.season_id) {
          resolvedId = mediaDescription.season_id;
          redirectPath = `/season/${mediaDescription.season_id}`;
        }
        break;

      case 'video':
        // For video MediaDescriptions, stay on the video page with the MediaDescription ID
        resolvedId = mediaDescription.id;
        redirectPath = `/video/${mediaDescription.id}`;
        break;

      default:
        console.warn('⚠️ MediaDescription Resolver: Unknown media type:', mediaDescription.media_type);
        break;
    }

    return {
      isMediaDescription: true,
      mediaType: mediaDescription.media_type as any,
      resolvedId,
      mediaDescription,
      redirectPath
    };

  } catch (error) {
    console.log('🔍 MediaDescription Resolver: Not a MediaDescription ID, treating as entity ID:', id);
    // If it's not a MediaDescription, assume it's a direct entity ID
    return {
      isMediaDescription: false
    };
  }
};

/**
 * Hook-like function to resolve MediaDescription IDs in React components
 */
export const useMediaDescriptionResolver = (_id: string | undefined) => {
  // This would ideally be a proper React hook, but for simplicity we'll export the resolver function
  // Components can call resolveMediaDescriptionId directly in their useEffect
  return { resolveMediaDescriptionId };
};