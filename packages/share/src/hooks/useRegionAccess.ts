import { useState, useEffect } from 'react';
import { MediaDescription } from '../types';
import { checkRegionAccess } from '../utils/regionValidation';

interface RegionAccessState {
  isAuthorized: boolean | null; // null = loading, false = blocked/failed, true = authorized
  isLoading: boolean;
  error?: 'network_error' | 'verification_failed' | 'region_blocked';
  countryCode?: string;
}

/**
 * Hook to check if the user is in an authorized region to watch a video
 * 
 * @param mediaDescription - The media description to check region access for
 * @returns RegionAccessState with authorization status and loading state
 */
export function useRegionAccess(mediaDescription: MediaDescription): RegionAccessState {
  const [state, setState] = useState<RegionAccessState>({
    isAuthorized: null,
    isLoading: true
  });

  useEffect(() => {
    let isMounted = true;

    const performRegionCheck = async () => {
      // Reset state to loading
      setState({
        isAuthorized: null,
        isLoading: true
      });

      try {
        const result = await checkRegionAccess(mediaDescription);

        // Only update state if component is still mounted
        if (isMounted) {
          setState({
            isAuthorized: result.isAuthorized,
            isLoading: false,
            error: result.error,
            countryCode: result.countryCode
          });

          // Log result for debugging
          if (result.isAuthorized) {
            console.log('Region access granted for country:', result.countryCode);
          } else {
            console.log('Region access denied:', {
              error: result.error,
              countryCode: result.countryCode
            });
          }
        }
      } catch (error) {
        console.error('Region access check failed:', error);
        
        if (isMounted) {
          setState({
            isAuthorized: false,
            isLoading: false,
            error: 'network_error'
          });
        }
      }
    };

    performRegionCheck();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [mediaDescription.id]); // Re-run when media description changes

  return state;
}

/**
 * Hook variant that takes a media description ID and performs the check
 * This is useful when you only have the ID and want to avoid prop drilling
 * 
 * Note: For Phase 1, since we use hardcoded countries, we don't actually need
 * the full mediaDescription, just the ID for effect dependency tracking
 */
export function useRegionAccessById(mediaDescriptionId: string): RegionAccessState {
  const [state, setState] = useState<RegionAccessState>({
    isAuthorized: null,
    isLoading: true
  });

  useEffect(() => {
    let isMounted = true;

    const performRegionCheck = async () => {
      setState({
        isAuthorized: null,
        isLoading: true
      });

      try {
        // For Phase 1, we create a minimal MediaDescription object
        // since we only use hardcoded countries anyway
        const mockMediaDescription: MediaDescription = {
          id: mediaDescriptionId,
          creation_date_utc: '',
          file_number: 0,
          episode_title: '',
          media_type: 'video'
        };

        const result = await checkRegionAccess(mockMediaDescription);

        if (isMounted) {
          setState({
            isAuthorized: result.isAuthorized,
            isLoading: false,
            error: result.error,
            countryCode: result.countryCode
          });
        }
      } catch (error) {
        console.error('Region access check failed:', error);
        
        if (isMounted) {
          setState({
            isAuthorized: false,
            isLoading: false,
            error: 'network_error'
          });
        }
      }
    };

    performRegionCheck();

    return () => {
      isMounted = false;
    };
  }, [mediaDescriptionId]);

  return state;
}