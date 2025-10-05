import { MediaDescription, VideoFile, Picture } from '../types';
import { picturesApi } from '../api/pictures';
import { usePicture } from '../hooks/usePicture';

/**
 * Determines if a video is horizontal or vertical based on its dimensions
 * @param videoFile - The video file to check
 * @returns 'horizontal' if width > height, 'vertical' if height > width, 'horizontal' (default) if unknown
 */
export function getVideoOrientation(videoFile: VideoFile | null): 'horizontal' | 'vertical' {
  if (!videoFile || !videoFile.max_resolution_width || !videoFile.max_resolution_height) {
    // Default to horizontal (1920x1080) when resolution data is missing
    return 'horizontal';
  }
  
  return videoFile.max_resolution_width > videoFile.max_resolution_height ? 'horizontal' : 'vertical';
}

/**
 * Fetches the appropriate poster image URL for the Mux player based on video orientation
 * and available images in the media description
 * 
 * @param mediaDescription - The media description containing image references
 * @param videoFile - The video file to determine orientation
 * @returns Promise<string | null> - The poster URL or null if no suitable poster found
 */
export async function getPosterUrl(
  mediaDescription: MediaDescription, 
  videoFile: VideoFile | null
): Promise<string | null> {
  const orientation = getVideoOrientation(videoFile);
  
  try {
    let imageId: string | null = null;
    
    if (orientation === 'horizontal' && mediaDescription.image_1920_1080_id) {
      // For horizontal videos, prefer 1920x1080 image
      imageId = mediaDescription.image_1920_1080_id;
    } else if (orientation === 'vertical' && mediaDescription.image_1080_1920_id) {
      // For vertical videos, prefer 1080x1920 image
      imageId = mediaDescription.image_1080_1920_id;
    }
    
    if (imageId) {
      const picture = await picturesApi.getById(imageId);
      return picture.image_url;
    }
  } catch (error) {
    console.warn('Failed to fetch poster image:', error);
  }
  
  return null;
}

/**
 * Utility to get poster URL synchronously if the Picture objects are already available
 * This is useful when you already have the Picture objects fetched
 * 
 * @param mediaDescription - The media description containing image references
 * @param videoFile - The video file to determine orientation
 * @param pictures - Pre-fetched picture objects keyed by their IDs
 * @returns string | null - The poster URL or null if no suitable poster found
 */
export function getPosterUrlSync(
  mediaDescription: MediaDescription,
  videoFile: VideoFile | null,
  pictures: Record<string, Picture>
): string | null {
  const orientation = getVideoOrientation(videoFile);

  let imageId: string | null = null;

  if (orientation === 'horizontal' && mediaDescription.image_1920_1080_id) {
    // For horizontal videos, prefer 1920x1080 image
    imageId = mediaDescription.image_1920_1080_id;
  } else if (orientation === 'vertical' && mediaDescription.image_1080_1920_id) {
    // For vertical videos, prefer 1080x1920 image
    imageId = mediaDescription.image_1080_1920_id;
  }

  if (imageId && pictures[imageId]) {
    return pictures[imageId].image_url;
  }

  return null;
}

/**
 * React hook to get the appropriate poster URL with React Query caching
 * Use this in React components for automatic caching and re-fetching
 *
 * @param mediaDescription - The media description containing image references
 * @param videoFile - The video file to determine orientation
 * @returns Object with poster URL, loading state, and error
 *
 * @example
 * const { posterUrl, isLoading, error } = usePosterUrl(mediaDescription, videoFile);
 */
export function usePosterUrl(
  mediaDescription: MediaDescription | null,
  videoFile: VideoFile | null
) {
  const orientation = getVideoOrientation(videoFile);

  let imageId: string | null = null;

  if (mediaDescription) {
    if (orientation === 'horizontal' && mediaDescription.image_1920_1080_id) {
      imageId = mediaDescription.image_1920_1080_id;
    } else if (orientation === 'vertical' && mediaDescription.image_1080_1920_id) {
      imageId = mediaDescription.image_1080_1920_id;
    }
  }

  const { data: picture, isLoading, error } = usePicture(imageId);

  return {
    posterUrl: picture?.image_url || null,
    isLoading,
    error,
  };
}