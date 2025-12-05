import { MediaShowcaseItemJSON } from '../types';

/**
 * Intelligently select the appropriate image URL variant based on display context.
 *
 * This function extracts the format from the thumbnail_url and returns the corresponding
 * large or small variant URL from the item's format-specific fields.
 *
 * @param item - The media showcase item containing all image URL variants
 * @param preferLarge - If true, prefer large variants for high-quality displays (hero, carousel).
 *                      If false, prefer small variants for performance (lists, grids).
 * @returns The selected image URL, or falls back to thumbnail_url if variants unavailable
 */
export function selectImageUrl(
  item: MediaShowcaseItemJSON | undefined,
  preferLarge: boolean = false
): string | undefined {
  // Guard against undefined item
  if (!item) return undefined;

  // If no thumbnail_url, return undefined
  if (!item.thumbnail_url) return undefined;

  // Extract format from thumbnail_url (e.g., "1920x1080", "1080x1080")
  // Expected URL patterns:
  // - https://example.com/path/image-1920x1080.jpg
  // - https://example.com/path/image-1920-x-1080_small.webp
  // - https://example.com/path/image_1920_1080_large.jpg
  const formatMatch = item.thumbnail_url.match(/(\d{3,4})[_\-\s]?x[_\-\s]?(\d{3,4})/i);

  if (!formatMatch) {
    // Cannot parse format, return original thumbnail_url
    return item.thumbnail_url;
  }

  const width = formatMatch[1];
  const height = formatMatch[2];
  const format = `${width}x${height}`;

  // Map format to the corresponding field names
  const formatFieldMap: Record<string, {
    standard: keyof MediaShowcaseItemJSON;
    large: keyof MediaShowcaseItemJSON;
    small: keyof MediaShowcaseItemJSON;
  }> = {
    '1920x1080': {
      standard: 'image_1920_1080_url',
      large: 'image_1920_1080_large_url',
      small: 'image_1920_1080_small_url',
    },
    '1920x720': {
      standard: 'image_1920_720_url',
      large: 'image_1920_720_large_url',
      small: 'image_1920_720_small_url',
    },
    '1080x1080': {
      standard: 'image_1080_1080_url',
      large: 'image_1080_1080_large_url',
      small: 'image_1080_1080_small_url',
    },
    '810x1080': {
      standard: 'image_810_1080_url',
      large: 'image_810_1080_large_url',
      small: 'image_810_1080_small_url',
    },
    '1080x1920': {
      standard: 'image_1080_1920_url',
      large: 'image_1080_1920_large_url',
      small: 'image_1080_1920_small_url',
    },
  };

  const fieldNames = formatFieldMap[format];

  if (!fieldNames) {
    // Unknown format, return original thumbnail_url
    return item.thumbnail_url;
  }

  // Select URL based on preference with cascading fallback
  if (preferLarge) {
    // For large displays: prefer large > standard > thumbnail_url
    return (
      item[fieldNames.large] as string | undefined ||
      item[fieldNames.standard] as string | undefined ||
      item.thumbnail_url
    );
  } else {
    // For small displays: prefer small > standard > thumbnail_url
    return (
      item[fieldNames.small] as string | undefined ||
      item[fieldNames.standard] as string | undefined ||
      item.thumbnail_url
    );
  }
}

/**
 * Get the optimal image URL for thumbnail displays (lists, grids).
 * Prefers small variants for better performance.
 *
 * @param item - The media showcase item
 * @returns The optimal thumbnail URL
 */
export function getThumbnailImageUrl(item: MediaShowcaseItemJSON | undefined): string | undefined {
  return selectImageUrl(item, false);
}

/**
 * Get the optimal image URL for hero/featured displays (carousels, banners).
 * Prefers large variants for better quality.
 *
 * @param item - The media showcase item
 * @returns The optimal hero image URL
 */
export function getHeroImageUrl(item: MediaShowcaseItemJSON | undefined): string | undefined {
  return selectImageUrl(item, true);
}
