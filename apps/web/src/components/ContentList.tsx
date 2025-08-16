import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ContentListItem {
  content_id: string;
  content_type: string;
  title: string;
  thumbnail_url?: string;
  display_order: number;
}

interface ContentListProps {
  contentList: {
    id: string;
    title: string;
    description?: string;
    thumbnail_format: string;
    thumbnail_width?: number;
    thumbnail_height?: number;
    items?: ContentListItem[];
    [key: string]: any;
  };
}

const ContentList: React.FC<ContentListProps> = ({ contentList }) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  if (!contentList) {
    return null;
  }

  const handleItemClick = (item: ContentListItem) => {
    console.log('ContentList: Item clicked:', item);
    
    // Navigate to video screen for media_description content type
    if (item.content_type === 'media_description') {
      navigate(`/video/${item.content_id}`);
    } else {
      // For other content types (program, season), we might need different handling
      console.log('Non-video content clicked:', item.content_type);
    }
  };

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [contentList.items]);

  const renderContentItem = (item: ContentListItem) => {
    // Use thumbnail dimensions from contentList, fallback to 128px square
    const width = contentList.thumbnail_width || 128;
    const height = contentList.thumbnail_height || 128;
    
    return (
      <div
        key={item.content_id}
        className="cursor-pointer flex-shrink-0 mr-3"
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
      <h2 className="text-kyool-blue text-xl font-bold mb-2 px-4">
        {contentList.title || 'Untitled Content List'}
      </h2>
      {contentList.description && (
        <p className="text-gray-400 text-sm mb-4 px-4">
          {contentList.description}
        </p>
      )}
      
      {contentList.items && contentList.items.length > 0 ? (
        <div className="relative">
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={scrollLeft}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-2 transition-all duration-200"
              aria-label="Scroll left"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
              {contentList.items
                .sort((a, b) => a.display_order - b.display_order)
                .map((item: ContentListItem) =>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      ) : (
        <p className="text-gray-500 text-sm italic text-center py-8">
          No content items
        </p>
      )}
    </div>
  );
};

export default ContentList;