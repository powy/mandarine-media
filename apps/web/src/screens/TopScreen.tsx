import React from 'react';
import MediaShowcase from '../components/MediaShowcase';
import ErrorScreen from './ErrorScreen';
import BigCarousel from '@src/components/ContentList/Displays/TopHero';
import useGetListPage from '@src/hooks/useGetListPage';

interface TopScreenProps {
  screenDescriptionId?: string;
  screenType?: string;
}

const TopScreen: React.FC<TopScreenProps> = ({ screenType }) => {
  const { isLoading, error, screenData } = useGetListPage();

  if (!isLoading && !screenData) {
    return (
      <ErrorScreen
        title="Screen not found"
        message="No screen ID or type provided. Please check the URL or navigation."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-kyool-blue">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kyool-blue mx-auto mb-4"></div>
            <p className="text-kyool-blue">Loading screen content...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Error loading screen description:', error);
    return (
      <ErrorScreen
        title="Failed to load screen"
        message={`Could not load screen content. ${error instanceof Error ? error.message : 'Unknown error occurred.'}`}
      />
    );
  }

  if (!screenData) {
    return (
      <ErrorScreen
        title="Screen not found"
        message="The requested screen could not be found."
      />
    );
  }

  // Use media_showcases from screen data
  const showcases = screenData.media_showcases || [];
  const hero = showcases.length > 0 && showcases[0].items?.length > 0
    ? showcases[0]
    : null;

  console.log('All showcased %o', showcases);

  console.log('All showcased %o', showcases);

  return (
    <div className="min-h-screen bg-black text-kyool-blue">
      {/* Hero Top Section */}
      {hero && <BigCarousel showcase={hero} />}

      {/* Media Showcases */}
      <div className="mx-auto mt-10 max-w-[1920px] m-auto">
        {/* Media Showcase rendering */}

        {showcases.length > 0 ? (
          showcases.map((showcase: any, index: number) => {
            // Ensure the showcase has the required structure
            if (!showcase.is_active) {
              return null;
            }

            // Removing the one used as Hero
            if (index == 0) {
              return null;
            }

            return (
              <>
                <MediaShowcase key={showcase.id || index} showcase={showcase} />
                {index < showcases.length - 1 && (
                  <hr className="border-kyool-blue-dark/30 m-auto mb-10" />
                )}
              </>
            );
          })
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              No content available for this screen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopScreen;
