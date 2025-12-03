import { useQuery } from '@tanstack/react-query';
import { createContext, FC, ReactNode, useContext, useMemo } from 'react';
import { getScreenDescriptions } from 'share';

type AppContextProps = {
  isLoading: boolean;
  homePageId: string | null;
  menu: NavigationItem[];
};

type NavigationItem = {
  label: string;
  id: string;
  path: string;
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppContextProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { isPending, data: screenDescriptions } = useQuery({
    queryKey: ['screenDescriptions', 'active'],
    queryFn: () =>
      getScreenDescriptions({
        is_active: true,
        limit: 10,
      }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  console.log('receiving screen descriptions %o', screenDescriptions);

  const homePageId: AppContextProps['homePageId'] = useMemo(() => {
    if (screenDescriptions) {
      const homeScreen = (screenDescriptions.data || []).find(
        (screen) => screen.title == 'A la une'
      );
      if (homeScreen) {
        return homeScreen.id;
      } else {
        return screenDescriptions.data.length > 0
          ? screenDescriptions.data.sort(
              (a, b) => a.display_order - b.display_order
            )[0].id
          : null;
      }
    }
    return null;
  }, [screenDescriptions]);

  const navigationItems: NavigationItem[] = useMemo(
    () => [
      // Add dynamic screen descriptions
      ...(screenDescriptions?.data || [])
        .filter((screen) => screen.title !== 'A la une')
        .sort((a, b) => a.display_order - b.display_order)
        .map((screen) => {
          return {
            label: screen.title,
            id: screen.id,
            path: `/screen/${screen.id}`,
          };
        }),
    ],
    [screenDescriptions]
  );

  const value = useMemo(
    () => ({ isLoading: isPending, menu: navigationItems, homePageId }),
    [navigationItems, isPending]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within a AppContext');
  }
  return context;
};
