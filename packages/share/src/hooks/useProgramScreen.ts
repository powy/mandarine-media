import { useQuery } from '@tanstack/react-query';
import { getProgramScreenDataByProgramId } from '../api';
import type { ProgramScreenData } from '../types';

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
          message: (error as any)?.message,
          response: (error as any)?.response,
          status: (error as any)?.response?.status,
          data: (error as any)?.response?.data
        });
        throw error;
      }
    },
    enabled: !!programId,
  });
};