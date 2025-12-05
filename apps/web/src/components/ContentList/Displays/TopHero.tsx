import {
  getMediaShowcaseItemRoute,
  MediaShowcaseItem,
  MediaShowcaseJSON,
  resolveMediaDescriptionId,
  useMediaShowcaseLogic,
  getHeroImageUrl,
} from 'share';
import { useNavigate } from 'react-router-dom';
import { ContentThemedButton } from './TopHero.styles';

interface BigCarouselProps {
  showcase: MediaShowcaseJSON;
}

const BigCarousel: React.FC<BigCarouselProps> = ({ showcase }) => {
  const navigate = useNavigate();

  const {
    sortedItems,
    isValidShowcase,
    currentCarouselIndex,
    goToCarouselItem,
  } = useMediaShowcaseLogic(showcase);

  if (!isValidShowcase) {
    return null;
  }

  // Guard against empty sortedItems array
  if (!sortedItems || sortedItems.length === 0) {
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

  const renderCarouselItem = (item: MediaShowcaseItem) => {
    console.log('tophero item %o', item);
    return (
      <div
        key={item.id}
        className="cursor-pointer flex flex-col items-left absolute bottom-16 w-full max-w-[1920px] m-auto px-4"
      >
        <h3 className="text-white text-lg font-extrabold text-left leading-tight max-w-sm py-4">
          {item.title}
        </h3>
        {item.descriptive_summary_text && (
          <p className="text-gray-400 text-sm text-left mt-2 max-w-sm line-clamp-2">
            {item.descriptive_summary_text}
          </p>
        )}
        <div className="flex flex-row items-center">
          <ContentThemedButton
            radius="sm"
            className="my-4"
            onClick={() => handleItemClick(item)}
          >
            Regarder
          </ContentThemedButton>
        </div>
      </div>
    );
  };

  return (
    // Carousel display
    <div
      className="relative flex flex-col items-center h-[350px] md:h-[500px] lg:h-[600px] 2xl:h-[700px]"
      style={{
        backgroundImage: `url(${getHeroImageUrl(sortedItems[currentCarouselIndex])})`,
        height: '600px',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      {/* Carousel Container */}
      <div className="flex justify-center items-center w-full py-8 h-full bg-gradient-to-t from-black/95 to-100%">
        {/* Current Carousel Item */}
        {renderCarouselItem(sortedItems[currentCarouselIndex])}
        {/* Dot Indicators */}
        <div className="flex space-x-2 mt-4 absolute bottom-8">
          {sortedItems.map((_, index) => (
            <button
              key={index}
              onClick={() => goToCarouselItem(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 hover:cursor-pointer ${
                index === currentCarouselIndex
                  ? 'bg-white'
                  : 'bg-gray-400 hover:bg-gray-500'
              }`}
              aria-label={`Go to item ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BigCarousel;
