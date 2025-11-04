import { useState, useEffect, useMemo } from 'react';
import type { MediaShowcaseJSON, ThumbnailFormatEnum } from '../types';

export const useMediaShowcase = (showcase: MediaShowcaseJSON | null) => {
  // Carousel state management
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  // Sort items by display_order - this is data processing logic moved from component
  const sortedItems = useMemo(() => {
    if (!showcase?.items) return [];
    return [...showcase.items].sort((a, b) => a.display_order - b.display_order);
  }, [showcase?.items]);

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

  // Calculate thumbnail dimensions based on showcase format
  const getThumbnailDimensions = (format: ThumbnailFormatEnum, baseWidth: number = 300) => {
    if (!showcase) return { width: 128, height: 128 };

    switch (format) {
      case '1920x1080':
        return { width: baseWidth, height: Math.round(baseWidth / (1920 / 1080)) };

      case '1920x720':
        return { width: baseWidth, height: Math.round(baseWidth / (1920 / 1070)) };
      
      case '1080x1080':
        return { width: baseWidth, height: baseWidth };

      case '810x1080':
        return { width: baseWidth, height: Math.round(baseWidth / (810 / 1080)) };

      case '1080x1920':
        return { width: baseWidth, height: Math.round(baseWidth / (1080 / 1920)) };

      default:
        return { width: 128, height: 128 };
    }
  };


  // Check if showcase is valid and active
  const isValidShowcase = showcase && showcase.is_active;

  return {
    // Data
    sortedItems,
    isValidShowcase,

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