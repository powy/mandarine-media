import {
  ContentListItem,
  getContentListItemRoute,
  useContentList,
} from 'share';
import ContentList from '../ContentList';
import { useNavigate } from 'react-router-dom';

interface CarouselProps {
  contentList: ContentList;
}

const Carousel: React.FC<CarouselProps> = ({ contentList }) => {
  const navigate = useNavigate();

  const {
    sortedItems,
    currentCarouselIndex,
    goToNextCarouselItem,
    goToPrevCarouselItem,
    goToCarouselItem,
    getThumbnailDimensions,
  } = useContentList(contentList);

  const handleItemClick = (item: ContentListItem) => {
    console.log('ContentList: Item clicked:', item);
    navigate(getContentListItemRoute(item));
  };

  const renderCarouselItem = (item: ContentListItem) => {
    // Use shared utility for carousel thumbnail dimensions
    const { width, height } = getThumbnailDimensions(600);

    return (
      <div
        key={item.content_id}
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
              alt={item.image_alt_text || item.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              title={item.short_summary || item.description || item.title}
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
        {(item.short_summary || item.description) && (
          <p className="text-gray-400 text-sm text-center mt-2 max-w-sm line-clamp-2">
            {item.short_summary || item.description}
          </p>
        )}
      </div>
    );
  };

  return (
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
  );
};

export default Carousel;
