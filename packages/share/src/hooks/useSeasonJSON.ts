import { useQuery } from '@tanstack/react-query';
import { seasonsApi } from '../api/seasons';
import { mediaApi } from '../api/media';
import { transformSeasonJSON, type TransformedSeasonData } from '../utils/seasonAdapters';
import type { Season, MediaDescription } from '../types';

export interface SeasonNavigationData extends TransformedSeasonData {
  nextSeason: Season | null;
  previousSeason: Season | null;
  generalDescription: MediaDescription | null;
}

/**
 * Custom hook to fetch and transform season JSON cache data
 *
 * This hook:
 * - Fetches season data from the JSON cache endpoint (1-2 API calls)
 * - Transforms the raw JSON into display-ready format
 * - Fetches prev/next season navigation data (if program_id exists)
 * - Provides loading and error states
 *
 * Benefits over legacy approach:
 * - 1-2 API calls instead of 8-12 calls
 * - Faster response time (cached JSON)
 * - Reduced server load
 * - Simpler data flow
 *
 * @param seasonId - The UUID of the season to fetch
 * @param refresh - Optional: Force refresh of cached JSON
 * @returns React Query result with transformed season data and navigation
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSeasonJSON(seasonId);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage />;
 *
 * return (
 *   <>
 *     <SeasonDetails season={data.season} episodes={data.episodes} />
 *     {data.nextSeason && <NextSeasonLink season={data.nextSeason} />}
 *   </>
 * );
 * ```
 */
export function useSeasonJSON(seasonId: string | undefined, refresh: boolean = false) {
  return useQuery({
    queryKey: ['season-json', seasonId, refresh],
    queryFn: async (): Promise<SeasonNavigationData> => {
      if (!seasonId) {
        throw new Error('Season ID is required');
      }

      console.log('🔍 useSeasonJSON: Fetching JSON for season:', seasonId);

      // Fetch season JSON from cache (first API call)
      const seasonJSON = await seasonsApi.getSeasonJSON(seasonId, refresh);

      console.log('✅ useSeasonJSON: JSON received:', seasonJSON);

      // Transform to display-ready format
      const transformedData = transformSeasonJSON(seasonJSON);

      console.log('✅ useSeasonJSON: Data transformed:', transformedData);

      // Fetch full Season object to get general_media_description_id
      let generalDescription: MediaDescription | null = null;
      try {
        console.log('🔍 useSeasonJSON: Fetching full Season object');
        const season = await seasonsApi.getById(seasonId);

        if (season.general_media_description_id) {
          console.log('🔍 useSeasonJSON: Fetching general MediaDescription:', season.general_media_description_id);
          generalDescription = await mediaApi.getMediaDescription(season.general_media_description_id);
          console.log('✅ useSeasonJSON: General MediaDescription fetched');
        }
      } catch (error) {
        console.warn('⚠️ useSeasonJSON: Failed to fetch general MediaDescription:', error);
      }

      // Fetch prev/next season navigation if program_id exists (second API call)
      let nextSeason: Season | null = null;
      let previousSeason: Season | null = null;

      if (seasonJSON.program_id) {
        try {
          console.log('🔍 useSeasonJSON: Fetching seasons for navigation');

          const seasonsResponse = await seasonsApi.getAll({
            program_id: seasonJSON.program_id,
            skip: 0,
            limit: 50
          });

          // Handle different response formats (direct array vs paginated)
          const seasonsData = Array.isArray(seasonsResponse)
            ? seasonsResponse
            : seasonsResponse.data || [];

          if (Array.isArray(seasonsData) && seasonsData.length > 0) {
            const sortedSeasons = seasonsData.sort(
              (a, b) => a.season_number - b.season_number
            );

            const currentIndex = sortedSeasons.findIndex(s => s.id === seasonId);

            if (currentIndex > 0) {
              previousSeason = sortedSeasons[currentIndex - 1];
            }

            if (currentIndex >= 0 && currentIndex < sortedSeasons.length - 1) {
              nextSeason = sortedSeasons[currentIndex + 1];
            }

            console.log('✅ useSeasonJSON: Navigation data:', {
              currentIndex,
              hasPrevious: !!previousSeason,
              hasNext: !!nextSeason
            });
          }
        } catch (error) {
          console.warn('⚠️ useSeasonJSON: Failed to fetch navigation data:', error);
          // Continue without navigation - not critical
        }
      }

      return {
        ...transformedData,
        nextSeason,
        previousSeason,
        generalDescription
      };
    },
    enabled: !!seasonId,
    staleTime: 5 * 60 * 1000, // 5 minutes - JSON cache is relatively stable
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export type { TransformedSeasonData };
