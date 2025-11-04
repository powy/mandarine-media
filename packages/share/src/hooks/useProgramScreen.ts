import { useQuery } from '@tanstack/react-query';
import { getProgramScreenDataByProgramId } from '../api';
import type { ProgramScreenData } from '../types';

/**
 * @deprecated Use `useProgramJSON` hook instead for better performance.
 *
 * This hook makes 15-30 API calls to fetch program data. The new `useProgramJSON`
 * hook uses cached JSON from the backend (1 API call) for much better performance.
 *
 * Migration:
 * ```
 * // Old:
 * import { useProgramScreen } from 'share';
 * const { data, isLoading, error } = useProgramScreen(programId);
 *
 * // New:
 * import { useProgramJSON } from 'share';
 * const { data, isLoading, error } = useProgramJSON(programId);
 * ```
 *
 * Note: The new hook returns a simplified data structure without actors/directors/producers.
 * If you need that data, additional API calls will be required.
 */
export const useProgramScreen = (programId: string | undefined) => {
  return useQuery<ProgramScreenData>({
    queryKey: ['program-screen', programId],
    queryFn: async () => {
      if (!programId) throw new Error('Program ID is required');
      console.log('🔍 useProgramScreen: Fetching data for program ID:', programId);
      console.log('🔍 useProgramScreen: API call starting...');
      try {
        const result = await getProgramScreenDataByProgramId(programId);
        console.log('✅ useProgramScreen: API call successful:', result);
        return result;
      } catch (error) {
        console.error('❌ useProgramScreen: API call failed:', error);
        console.error('❌ useProgramScreen: Error details:', {
          programId: programId,
          message: (error as any)?.message,
          response: (error as any)?.response,
          status: (error as any)?.response?.status,
          data: (error as any)?.response?.data,
          possibleCause: (error as any)?.response?.status === 404
            ? 'Program not found - verify the program ID exists or check if a season ID was passed instead'
            : 'Unknown API error'
        });
        throw error;
      }
    },
    enabled: !!programId,
  });
};