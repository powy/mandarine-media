import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getScreenDescriptions } from 'share';

const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();

  // Fetch screen descriptions to get the first one
  const { data: screenDescriptions, isLoading } = useQuery({
    queryKey: ['screenDescriptions', 'active'],
    queryFn: () =>
      getScreenDescriptions({
        is_active: true,
        limit: 10,
      }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  useEffect(() => {
    if (!isLoading && screenDescriptions?.data) {
      // Sort by display_order and get the first screen
      const sortedScreens = [...screenDescriptions.data].sort(
        (a, b) => a.display_order - b.display_order
      );

      if (sortedScreens.length > 0) {
        const firstScreen = sortedScreens[0];
        navigate(`/screen/${firstScreen.id}`);
      } else {
        // Fallback if no screens available
        navigate('/error');
      }
    }
  }, [isLoading, screenDescriptions, navigate]);

  // Show loading state while fetching
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-kyool-blue"></div>
        <p className="text-kyool-blue text-lg">Chargement...</p>
      </div>
    </div>
  );
};

export default WelcomeScreen;