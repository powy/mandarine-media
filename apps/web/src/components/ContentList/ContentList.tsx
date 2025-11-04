import React, { useRef, useState, useEffect } from 'react';
import { useMediaShowcaseLogic } from 'share';
import type {
  ContentListItem,
  MediaShowcaseItem,
  MediaShowcaseJSON,
} from 'share';
import BigCarousel from './Displays/TopHero';

type ContentList = {
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
};

interface ContentListProps {
  contentList: MediaShowcaseJSON;
}

const ContentList: React.FC<ContentListProps> = ({ contentList }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Use shared hook for logic
  const {
    sortedItems,
    isValidShowcase,
    goToNextCarouselItem,
    goToPrevCarouselItem,
    getThumbnailDimensions,
  } = useMediaShowcaseLogic(contentList);

  if (!isValidShowcase) {
    return null;
  }

  const handleItemClick = (item: MediaShowcaseItem) => {
    console.log('ContentList: Item clicked:', item);
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
    if (contentList?.list_type === 'carousel') {
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
    contentList?.list_type,
    sortedItems,
    goToPrevCarouselItem,
    goToNextCarouselItem,
  ]);

  const renderContentItem = (item: MediaShowcaseItem) => {
    // Use shared utility for thumbnail dimensions
    const { width, height } = getThumbnailDimensions('1920x1080', 300);

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

  return (
    <div className="mb-8">
      {sortedItems.length > 0 ? (
        // Classic horizontal list display
        <>
          {contentList?.list_type === 'carousel' ? (
            <BigCarousel showcase={contentList} />
          ) : (
            <>
              <h2 className="text-kyool-blue text-xl font-bold mb-2 px-4">
                {contentList?.title || 'Untitled Content List'}
              </h2>
              {contentList?.description && (
                <p className="text-gray-400 text-sm mb-4 px-4">
                  {contentList.description}
                </p>
              )}

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
                      renderContentItem(item)
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
            </>
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

export default ContentList;
