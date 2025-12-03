import { useState, useCallback } from 'react';
import { verifyVideoFile } from '../api/media';
import { VideoFileVerifyResponse } from '../types';

export interface UseVerifyVideoFileState {
  isLoading: boolean;
  error: string | null;
  result: VideoFileVerifyResponse | null;
}

export interface UseVerifyVideoFileReturn {
  state: UseVerifyVideoFileState;
  verify: (videoFileId: string) => Promise<VideoFileVerifyResponse | null>;
  reset: () => void;
}

export function useVerifyVideoFile(): UseVerifyVideoFileReturn {
  const [state, setState] = useState<UseVerifyVideoFileState>({
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

  const verify = useCallback(async (videoFileId: string): Promise<VideoFileVerifyResponse | null> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await verifyVideoFile(videoFileId);
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
