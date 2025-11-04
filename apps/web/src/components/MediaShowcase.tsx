import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useMediaShowcaseLogic,
  getMediaShowcaseItemRoute,
  resolveMediaDescriptionId,
} from 'share';
import type { MediaShowcaseItem, MediaShowcaseJSON } from 'share';
import ClassicShowcase from './ContentList/Displays/Classic';
import Carousel from './ContentList/Displays/Carousel';

interface MediaShowcaseProps {
  showcase: MediaShowcaseJSON;
}

const MediaShowcase: React.FC<MediaShowcaseProps> = ({ showcase }) => {
  const navigate = useNavigate();

  // Use shared hook for logic
  const { sortedItems, isValidShowcase } = useMediaShowcaseLogic(showcase);

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

  // Keyboard navigation for carousel
  // useEffect(() => {
  //   if (showcase?.list_type === 'carousel') {
  //     const handleKeyDown = (event: KeyboardEvent) => {
  //       if (event.key === 'ArrowLeft') {
  //         goToPrevCarouselItem();
  //       } else if (event.key === 'ArrowRight') {
  //         goToNextCarouselItem();
  //       }
  //     };

  //     window.addEventListener('keydown', handleKeyDown);
  //     return () => window.removeEventListener('keydown', handleKeyDown);
  //   }
  // }, [
  //   showcase?.list_type,
  //   sortedItems,
  //   goToPrevCarouselItem,
  //   goToNextCarouselItem,
  // ]);

  const renderShowcase = React.useCallback(() => {
    switch (showcase?.list_type) {
      case 'carousel':
        return <Carousel showcase={showcase} />;

      case 'classic':
        return <ClassicShowcase showcase={showcase} />;

      default:
        return <ClassicShowcase showcase={showcase} />;
    }
  }, [showcase]);

  return (
    <div className="mb-10">
      <h2 className="text-white text-xl font-bold mb-4 px-4 capitalize">
        {showcase?.title || 'Untitled Media Showcase'}
      </h2>
      {showcase?.description && (
        <p className="text-gray-400 text-sm mb-4 px-4">
          {showcase.description}
        </p>
      )}

      {sortedItems.length > 0 ? (
        <>{renderShowcase()}</>
      ) : (
        <p className="text-gray-500 text-sm italic text-center py-8">
          No content items
        </p>
      )}
    </div>
  );
};

export default MediaShowcase;
