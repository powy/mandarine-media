import { useState, useEffect, useMemo } from 'react';
import type { ContentListItem } from '../types';

interface ContentListProps {
  id: string;
  title: string;
  description?: string;
  thumbnail_format: string;
  percentage_width?: number;
  percentage_height?: number;
  list_type: 'classic' | 'carousel';
  latest_first?: boolean;
  is_active?: boolean;
  display_order?: number;
  items?: ContentListItem[];
  [key: string]: any;
}

/**
 * @deprecated ContentList has been replaced by MediaShowcase. Use useMediaShowcase instead.
 * This hook is maintained only for backward compatibility with the alpha app.
 * For new code, use useMediaShowcase from 'share' package.
 */
export const useContentList = (contentList: ContentListProps | null) => {
  // Carousel state management
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  // Sort items by display_order - this is data processing logic moved from component
  const sortedItems = useMemo(() => {
    if (!contentList?.items) return [];
    return [...contentList.items].sort((a, b) => a.display_order - b.display_order);
  }, [contentList?.items]);

  // Navigation functions for carousel
  const goToNextCarouselItem = () => {
    if (sortedItems.length > 0) {
      setCurrentCarouselIndex((prevIndex) =>
        prevIndex === sortedItems.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const goToPrevCarouselItem = () => {
    if (sortedItems.length > 0) {
      setCurrentCarouselIndex((prevIndex) =>
        prevIndex === 0 ? sortedItems.length - 1 : prevIndex - 1
      );
    }
  };

  const goToCarouselItem = (index: number) => {
    setCurrentCarouselIndex(index);
  };

  // Reset carousel index when items change
  useEffect(() => {
    if (currentCarouselIndex >= sortedItems.length) {
      setCurrentCarouselIndex(0);
    }
  }, [sortedItems.length, currentCarouselIndex]);

  // Calculate thumbnail dimensions based on content list percentages
  const getThumbnailDimensions = (baseWidth: number = 300) => {
    if (!contentList) return { width: 128, height: 128 };

    const width = contentList.percentage_width
      ? Math.round((contentList.percentage_width / 100) * baseWidth)
      : 128;
    const height = contentList.percentage_height
      ? Math.round((contentList.percentage_height / 100) * baseWidth)
      : 128;
    return { width, height };
  };

  // Check if content list is valid
  const isValidContentList = !!contentList;

  return {
    // Data
    sortedItems,
    isValidContentList,

    // Carousel state
    currentCarouselIndex,

    // Navigation functions
    goToNextCarouselItem,
    goToPrevCarouselItem,
    goToCarouselItem,

    // Utility functions
    getThumbnailDimensions,
  };
};