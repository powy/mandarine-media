import { useState, useCallback } from 'react';
import { verifyMediaDescription } from '../api/media';
import { MediaDescriptionVerifyResponse } from '../types';

export interface UseVerifyMediaDescriptionState {
  isLoading: boolean;
  error: string | null;
  result: MediaDescriptionVerifyResponse | null;
}

export interface UseVerifyMediaDescriptionReturn {
  state: UseVerifyMediaDescriptionState;
  verify: (mediaDescriptionId: string) => Promise<MediaDescriptionVerifyResponse | null>;
  reset: () => void;
}

export function useVerifyMediaDescription(): UseVerifyMediaDescriptionReturn {
  const [state, setState] = useState<UseVerifyMediaDescriptionState>({
    isLoading: false,
    error: null,
    result: null,
  });

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      result: null,
    });
  }, []);

  const verify = useCallback(async (mediaDescriptionId: string): Promise<MediaDescriptionVerifyResponse | null> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await verifyMediaDescription(mediaDescriptionId);
      setState(prev => ({
        ...prev,
        isLoading: false,
        result: response,
      }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  return { state, verify, reset };
}
