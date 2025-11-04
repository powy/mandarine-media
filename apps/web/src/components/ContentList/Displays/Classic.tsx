import {
  getMediaShowcaseItemRoute,
  MediaShowcaseItem,
  MediaShowcaseJSON,
  resolveMediaDescriptionId,
  ThumbnailFormatEnum,
  useMediaShowcaseLogic,
} from 'share';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import ShowcaseBtn from '@src/components/ShowCaseBtn/ShowCaseBtn';

interface ClassicShowcaseProps {
  showcase: MediaShowcaseJSON;
}

const ClassicShowcase: React.FC<ClassicShowcaseProps> = ({ showcase }) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const {
    sortedItems,
    isValidShowcase,
    currentCarouselIndex,
    goToNextCarouselItem,
    goToPrevCarouselItem,
    goToCarouselItem,
    getThumbnailDimensions,
  } = useMediaShowcaseLogic(showcase);

  console.log('showcase %o', showcase);

  if (!isValidShowcase) {
    return null;
  }

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sortedItems]);

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

  const renderShowcaseItem = (
    item: MediaShowcaseItem,
    format: ThumbnailFormatEnum
  ) => {
    // Use shared utility for thumbnail dimensions
    const { width, height } = getThumbnailDimensions(format);
    console.log('width %o, height %o', width, height);

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
          className="text-white text-sm font-bold text-left leading-tight"
          style={{ width: `${width}px` }}
        >
          {item.title}
        </p>
      </div>
    );
  };

  return (
    // Classic horizontal list display
    <div className="relative">
      {/* Left Arrow */}
      <ShowcaseBtn
        direction="left"
        isVisible={showLeftArrow}
        onBtnClick={scrollLeft}
      />

      {/* Content Container */}
      <div className="px-4">
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide pb-2"
          onScroll={checkScrollButtons}
        >
          {sortedItems.map((item: MediaShowcaseItem) =>
            renderShowcaseItem(item, showcase.thumbnail_format)
          )}
        </div>
      </div>

      {/* Right Arrow */}
      <ShowcaseBtn
        direction="right"
        isVisible={showRightArrow}
        onBtnClick={scrollRight}
      />
    </div>
  );
};

export default ClassicShowcase;
