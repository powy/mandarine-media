import { useQuery } from '@tanstack/react-query';
import { programsApi } from '../api/programs';
import { mediaApi } from '../api/media';
import { transformProgramJSON, type TransformedProgramData } from '../utils/programAdapters';
import type { MediaDescription } from '../types';

export interface ProgramDataWithDescription extends TransformedProgramData {
  generalDescription: MediaDescription | null;
}

/**
 * Custom hook to fetch and transform program JSON cache data
 *
 * This hook:
 * - Fetches program data from the JSON cache endpoint (1 API call)
 * - Transforms the raw JSON into display-ready format
 * - Provides loading and error states
 *
 * Benefits over legacy approach:
 * - Single API call instead of 15-30 calls
 * - Faster response time (cached JSON)
 * - Reduced server load
 * - Simpler data flow
 *
 * @param programId - The UUID of the program to fetch
 * @param refresh - Optional: Force refresh of cached JSON
 * @returns React Query result with transformed program data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useProgramJSON(programId);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage />;
 *
 * return <ProgramDetails program={data.program} seasons={data.allSeasons} />;
 * ```
 */
export function useProgramJSON(programId: string | undefined, refresh: boolean = false) {
  return useQuery({
    queryKey: ['program-json', programId, refresh],
    queryFn: async () => {
      if (!programId) {
        throw new Error('Program ID is required');
      }

      console.log('🔍 useProgramJSON: Fetching JSON for program:', programId);

      // Fetch program JSON from cache (single API call)
      const programJSON = await programsApi.getProgramJSON(programId, refresh);

      console.log('✅ useProgramJSON: JSON received:', programJSON);

      // Transform to display-ready format
      const transformedData = transformProgramJSON(programJSON);

      console.log('✅ useProgramJSON: Data transformed:', transformedData);

      // Fetch full Program object to get general_media_description_id
      let generalDescription: MediaDescription | null = null;
      try {
        console.log('🔍 useProgramJSON: Fetching full Program object');
        const program = await programsApi.getById(programId);

        if (program.general_media_description_id) {
          console.log('🔍 useProgramJSON: Fetching general MediaDescription:', program.general_media_description_id);
          generalDescription = await mediaApi.getMediaDescription(program.general_media_description_id);
          console.log('✅ useProgramJSON: General MediaDescription fetched');
        }
      } catch (error) {
        console.warn('⚠️ useProgramJSON: Failed to fetch general MediaDescription:', error);
      }

      return {
        ...transformedData,
        generalDescription
      };
    },
    enabled: !!programId,
    staleTime: 5 * 60 * 1000, // 5 minutes - JSON cache is relatively stable
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export type { TransformedProgramData };
