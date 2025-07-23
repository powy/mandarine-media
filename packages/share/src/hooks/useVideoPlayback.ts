import { useState, useCallback } from 'react';
import { testVideoPlayback } from '../utils/videoUpload';

export interface UseVideoPlaybackState {
  isLoading: boolean;
  result: {
    success: boolean;
    playbackUrl?: string;
    errorMessage?: string;
    muxPlaybackId?: string;
  } | null;
  error: string | null;
}

export interface UseVideoPlaybackReturn {
  state: UseVideoPlaybackState;
  testPlayback: (videoFileId: string) => Promise<void>;
  reset: () => void;
}

/**
 * React hook for testing video file playback
 */
export function useVideoPlayback(): UseVideoPlaybackReturn {
  const [state, setState] = useState<UseVideoPlaybackState>({
    isLoading: false,
    result: null,
    error: null,
  });

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      result: null,
      error: null,
    });
  }, []);

  const testPlayback = useCallback(async (videoFileId: string): Promise<void> => {
    if (!videoFileId.trim()) {
      setState(prev => ({
        ...prev,
        error: 'Video file ID is required',
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      result: null,
    }));

    try {
      const result = await testVideoPlayback(videoFileId);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        result,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test playback';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  return {
    state,
    testPlayback,
    reset,
  };
}