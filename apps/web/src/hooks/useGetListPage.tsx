import { useAppContext } from '@src/AppContext';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getScreenDescriptionJSON, ScreenDescriptionJSON } from 'share';

interface GetListPageResponse {
  isLoading: boolean;
  error: Error | null;
  screenData?: ScreenDescriptionJSON;
}

export default function useGetListPage(): GetListPageResponse {
  const { screenId } = useParams<{ screenId: string }>();
  const { homePageId } = useAppContext();
  let finalScreenId: string | null = null;

  if (screenId) {
    finalScreenId = screenId;
  } else {
    finalScreenId = homePageId;
  }
  const {
    data: screenData,
    isPending,
    error,
  } = useQuery({
    queryKey: ['screenDescription', finalScreenId],
    queryFn: () => {
      if (!finalScreenId) {
        throw new Error('No screen ID provided');
      }
      return getScreenDescriptionJSON(finalScreenId);
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!finalScreenId,
  });

  return {
    isLoading: isPending,
    error,
    screenData,
  };
}
