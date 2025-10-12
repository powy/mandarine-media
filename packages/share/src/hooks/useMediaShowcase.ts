import { useState, useEffect, useMemo } from 'react';
import type { MediaShowcaseItem } from '../types';

interface MediaShowcaseProps {
  id: string;
  title: string;
  description?: string;
  thumbnail_format: string;
  width_percentage: number;
  height_percentage: number;
  is_active: boolean;
  priority_in_screen: number;
  list_type: 'classic' | 'carousel' | 'hero' | 'field' | 'ranking';
  last_updated: string;
  items: MediaShowcaseItem[];
}

export const useMediaShowcase = (showcase: MediaShowcaseProps | null) => {
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

  // Calculate thumbnail dimensions based on showcase percentages
  const getThumbnailDimensions = (baseWidth: number = 300) => {
    if (!showcase) return { width: 128, height: 128 };

    const width = Math.round((showcase.width_percentage / 100) * baseWidth);
    const height = Math.round((showcase.height_percentage / 100) * baseWidth);
    return { width, height };
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