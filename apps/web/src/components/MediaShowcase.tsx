import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useMediaShowcaseLogic,
  getMediaShowcaseItemRoute,
  resolveMediaDescriptionId,
} from 'share';
import type { MediaShowcaseItem, MediaShowcaseJSON } from 'share';

interface MediaShowcaseProps {
  showcase: MediaShowcaseJSON;
}

const MediaShowcase: React.FC<MediaShowcaseProps> = ({ showcase }) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Use shared hook for logic
  const {
    sortedItems,
    isValidShowcase,
    currentCarouselIndex,
    goToNextCarouselItem,
    goToPrevCarouselItem,
    goToCarouselItem,
    getThumbnailDimensions,
  } = useMediaShowcaseLogic(showcase);

  if (!isValidShowcase) {
    return null;
  }

  const handleItemClick = async (item: MediaShowcaseItem) => {
    console.log('MediaShowcase: Item clicked:', item);

    try {
      console.log(
        '🔍 MediaShowcase: Resolving MediaDescription for navigation:',
        item.id
      );
      const resolution = await resolveMediaDescriptionId(item.id);

      if (resolution.isMediaDescription && resolution.redirectPath) {
        console.log(
          '✅ MediaShowcase: Navigating to resolved path:',
          resolution.redirectPath
        );
        navigate(resolution.redirectPath);
      } else {
        console.log('🔄 MediaShowcase: Using fallback navigation logic');
        // Fallback to original logic for non-MediaDescription items or direct entity IDs
        navigate(getMediaShowcaseItemRoute(item));
      }
    } catch (error) {
      console.error(
        '❌ MediaShowcase: Failed to resolve MediaDescription for navigation:',
        error
      );
      // Fallback to video route if resolution fails
      console.log('🔄 MediaShowcase: Falling back to video route');
      navigate(`/video/${item.id}`);
    }
  };

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sortedItems]);

  // Keyboard navigation for carousel
  useEffect(() => {
    if (showcase?.list_type === 'carousel') {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft') {
          goToPrevCarouselItem();
        } else if (event.key === 'ArrowRight') {
          goToNextCarouselItem();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [
    showcase?.list_type,
    sortedItems,
    goToPrevCarouselItem,
    goToNextCarouselItem,
  ]);

  const renderShowcaseItem = (item: MediaShowcaseItem) => {
    // Use shared utility for thumbnail dimensions
    const { width, height } = getThumbnailDimensions(300);

    return (
      <div
        key={item.id}
        className="cursor-pointer shrink-0 mr-3"
        style={{ width: `${width}px` }}
        onClick={() => handleItemClick(item)}
      >
        <div
          className="rounded-lg overflow-hidden mb-2 bg-gray-800"
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          {item.thumbnail_url ? (
            <img
              src={item.thumbnail_url}
              alt={item.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              title={item.descriptive_summary_text || item.title}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <span className="text-gray-500 text-xs">No Image</span>
            </div>
          )}
        </div>
        <p
          className="text-kyool-blue text-sm font-medium text-center leading-tight"
          style={{ width: `${width}px` }}
        >
          {item.title}
        </p>
      </div>
    );
  };

  const renderCarouselItem = (item: MediaShowcaseItem) => {
    // Use shared utility for carousel thumbnail dimensions
    const { width, height } = getThumbnailDimensions(600);

    return (
      <div
        key={item.id}
        className="cursor-pointer flex flex-col items-center"
        onClick={() => handleItemClick(item)}
      >
        <div
          className="rounded-lg overflow-hidden mb-4 bg-gray-800 shadow-lg"
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          {item.thumbnail_url ? (
            <img
              src={item.thumbnail_url}
              alt={item.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              title={item.descriptive_summary_text || item.title}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <span className="text-gray-500 text-sm">No Image</span>
            </div>
          )}
        </div>
        <h3 className="text-kyool-blue text-lg font-medium text-center leading-tight max-w-sm">
          {item.title}
        </h3>
        {item.descriptive_summary_text && (
          <p className="text-gray-400 text-sm text-center mt-2 max-w-sm line-clamp-2">
            {item.descriptive_summary_text}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="mb-8">
      <h2 className="text-kyool-blue text-xl font-bold mb-2 px-4">
        {showcase?.title || 'Untitled Media Showcase'}
      </h2>
      {showcase?.description && (
        <p className="text-gray-400 text-sm mb-4 px-4">
          {showcase.description}
        </p>
      )}

      {sortedItems.length > 0 ? (
        <>
          {showcase?.list_type === 'carousel' ? (
            // Carousel display
            <div className="relative flex flex-col items-center">
              {/* Carousel Container */}
              <div className="relative flex justify-center items-center w-full py-8">
                {/* Left Arrow */}
                <button
                  onClick={goToPrevCarouselItem}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-3 transition-all duration-200"
                  aria-label="Previous item"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 18L9 12L15 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Current Carousel Item */}
                {renderCarouselItem(sortedItems[currentCarouselIndex])}

                {/* Right Arrow */}
                <button
                  onClick={goToNextCarouselItem}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-3 transition-all duration-200"
                  aria-label="Next item"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 18L15 12L9 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {/* Dot Indicators */}
              <div className="flex space-x-2 mt-4">
                {sortedItems.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToCarouselItem(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      index === currentCarouselIndex
                        ? 'bg-kyool-blue'
                        : 'bg-gray-600 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to item ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Classic horizontal list display
            <div className="relative">
              {/* Left Arrow */}
              {showLeftArrow && (
                <button
                  onClick={scrollLeft}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-2 transition-all duration-200"
                  aria-label="Scroll left"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 18L9 12L15 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              {/* Content Container */}
              <div className="px-4">
                <div
                  ref={scrollContainerRef}
                  className="flex overflow-x-auto scrollbar-hide pb-2"
                  onScroll={checkScrollButtons}
                >
                  {sortedItems.map((item: MediaShowcaseItem) =>
                    renderShowcaseItem(item)
                  )}
                </div>
              </div>

              {/* Right Arrow */}
              {showRightArrow && (
                <button
                  onClick={scrollRight}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-2 transition-all duration-200"
                  aria-label="Scroll right"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 18L15 12L9 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 text-sm italic text-center py-8">
          No content items
        </p>
      )}
    </div>
  );
};

export default MediaShowcase;
