import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getScreenDescriptionJSON, getScreenDescriptionByType } from 'share';
import MediaShowcase from '../components/MediaShowcase';
import ErrorScreen from './ErrorScreen';

interface TopScreenProps {
  screenDescriptionId?: string;
  screenType?: string;
}

const TopScreen: React.FC<TopScreenProps> = ({ screenDescriptionId, screenType }) => {
  // Get screen ID from route params if not provided as prop
  const { screenId } = useParams<{ screenId: string }>();
  const finalScreenId = screenDescriptionId || screenId;

  const { data: screenData, isLoading, error } = useQuery({
    queryKey: screenType ? ['screenDescriptionByType', screenType] : ['screenDescription', finalScreenId],
    queryFn: () => {
      if (screenType) {
        // Fetch by screen type and get JSON directly
        return getScreenDescriptionByType(screenType).then(screen =>
          getScreenDescriptionJSON(screen.id)
        );
      }
      if (!finalScreenId) {
        throw new Error('No screen ID provided');
      }
      return getScreenDescriptionJSON(finalScreenId);
    },
    enabled: !!(screenType || finalScreenId),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!screenType && !finalScreenId) {
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

  // Handle both new media_showcases format and legacy content_lists format
  const showcases = screenData.media_showcases || screenData.content_lists || [];

  return (
    <div className="min-h-screen bg-black text-kyool-blue">
      <div className="py-8">
        <div className="max-w-6xl mx-auto">
          {/* Screen Title */}
          <div className="px-4 mb-6">
            <h1 className="text-2xl font-bold text-kyool-blue mb-2">
              {screenData.title}
            </h1>
            {screenData.description && (
              <p className="text-gray-400 text-sm">
                {screenData.description}
              </p>
            )}
          </div>

          {/* Media Showcases */}
          {showcases.length > 0 ? (
            showcases.map((showcase: any, index: number) => {
              // Ensure the showcase has the required structure
              if (!showcase.is_active) {
                return null;
              }

              return (
                <MediaShowcase
                  key={showcase.id || index}
                  showcase={showcase}
                />
              );
            })
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No content available for this screen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopScreen;