import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MuxPlayer from '@mux/mux-player-react';
import { getVideoScreenData, getPosterUrl, apiClient, useAuth, useRegionAccessById, resolveMediaDescriptionId } from 'share';
import type { MediaDescription, VideoFile, Program, Season, PublicPerson, Language, Country } from 'share';

interface VideoScreenData {
  mediaDescription: MediaDescription;
  videoFile: VideoFile | null;
  relatedEpisodes: MediaDescription[];
  season: Season | null;
  program: Program | null;
  hasRelatedContent: boolean;
  actors: PublicPerson[];
  directors: PublicPerson[];
  producers: PublicPerson[];
  authors: PublicPerson[];
  audioLanguages: Language[];
  subtitleLanguages: Language[];
  originCountries: Country[];
}

const VideoScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [playbackToken, setPlaybackToken] = useState<string | null>(null);
  const [drmToken, setDrmToken] = useState<string | null>(null);
  const [isResolvingMediaType, setIsResolvingMediaType] = useState<boolean>(true);

  const { isAuthenticated } = useAuth();

  // Check region access using video ID
  const regionAccess = useRegionAccessById(id || '');

  // Resolve MediaDescription type and redirect if necessary
  useEffect(() => {
    const checkMediaType = async () => {
      if (!id) {
        setIsResolvingMediaType(false);
        return;
      }

      try {
        console.log('🔍 VideoScreen: Checking media type for ID:', id);
        const resolution = await resolveMediaDescriptionId(id);

        console.log('✅ VideoScreen: Media type resolved:', {
          isMediaDescription: resolution.isMediaDescription,
          mediaType: resolution.mediaType,
          redirectPath: resolution.redirectPath
        });

        // If this is a season or program MediaDescription, redirect
        if (resolution.isMediaDescription && resolution.redirectPath) {
          if (resolution.mediaType === 'season' || resolution.mediaType === 'program') {
            console.log('🔄 VideoScreen: Redirecting to appropriate screen:', resolution.redirectPath);
            navigate(resolution.redirectPath, { replace: true });
            return; // Don't set isResolvingMediaType to false - we're redirecting
          }
        }

        // Valid video type or not a MediaDescription - proceed with loading
        setIsResolvingMediaType(false);
      } catch (error) {
        console.error('❌ VideoScreen: Error resolving media type:', error);
        // On error, assume it's a valid video ID and proceed
        setIsResolvingMediaType(false);
      }
    };

    checkMediaType();
  }, [id, navigate]);

  const {
    data: videoData,
    isLoading,
    error,
  } = useQuery<VideoScreenData>({
    queryKey: ['video-screen', id],
    queryFn: async () => {
      if (!id) throw new Error('Video ID is required');

      console.log('🔍 VideoScreen: Starting getVideoScreenData for ID:', id);
      console.log('🔍 VideoScreen: Authentication state:', { isAuthenticated });

      try {
        const result = await getVideoScreenData(id);
        console.log('✅ VideoScreen: getVideoScreenData success:', {
          hasMediaDescription: !!result.mediaDescription,
          hasVideoFile: !!result.videoFile,
          mediaDescriptionId: result.mediaDescription?.id,
          videoFileId: result.videoFile?.id,
          relatedEpisodesCount: result.relatedEpisodes.length,
          hasError: false
        });
        return result;
      } catch (fetchError) {
        console.error('❌ VideoScreen: getVideoScreenData failed:', {
          error: fetchError,
          errorMessage: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          errorDetails: fetchError instanceof Error ? {
            name: fetchError.name,
            message: fetchError.message,
            stack: fetchError.stack
          } : fetchError,
          videoId: id,
          isAuthenticated
        });
        throw fetchError;
      }
    },
    enabled: !!id && !isResolvingMediaType,
  });

  useEffect(() => {
    if (error) {
      console.error('❌ VideoScreen: Error detected, analyzing...', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: typeof error,
        videoId: id,
        isAuthenticated,
        regionAccess: {
          isLoading: regionAccess.isLoading,
          isAuthorized: regionAccess.isAuthorized,
          error: regionAccess.error
        }
      });
      
      // Only redirect to error page after logging - this helps with debugging
      console.log('🔄 VideoScreen: Redirecting to error page due to:', error);
      // Navigate with error state for better debugging
      navigate('/error', { 
        replace: true, 
        state: { 
          originalError: error instanceof Error ? error.message : String(error),
          videoId: id,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [error, navigate, id, isAuthenticated, regionAccess]);

  // Debug log for Mux metrics activation
  useEffect(() => {
    if (videoData?.videoFile?.environment_key) {
      console.log('Mux metrics will be activated with environment_key:', videoData.videoFile.environment_key);
    } else if (videoData) {
      console.log('No environment_key found - Mux metrics will not be activated to avoid errors');
    }
  }, [videoData?.videoFile?.environment_key]);

  // Fetch poster URL when video data is available
  useEffect(() => {
    const fetchPoster = async () => {
      if (videoData?.mediaDescription && videoData?.videoFile) {
        try {
          const url = await getPosterUrl(videoData.mediaDescription, videoData.videoFile);
          setPosterUrl(url);
        } catch (error) {
          console.warn('Failed to fetch poster URL:', error);
          setPosterUrl(null);
        }
      }
    };
    
    fetchPoster();
  }, [videoData?.mediaDescription, videoData?.videoFile]);

  // Fetch playback token if video has signed playback policy
  useEffect(() => {
    const fetchTokens = async () => {
      // Only fetch tokens if user is authenticated and region is authorized
      if (!isAuthenticated) {
        console.log('Skipping token fetch: user not authenticated');
        setPlaybackToken(null);
        setDrmToken(null);
        return;
      }

      if (regionAccess.isLoading) {
        console.log('Skipping token fetch: region check in progress');
        return; // Don't set tokens to null yet, wait for region check
      }

      if (regionAccess.isAuthorized === false) {
        console.log('Skipping token fetch: region not authorized');
        setPlaybackToken(null);
        setDrmToken(null);
        return;
      }

      if (videoData?.videoFile?.id &&
          (videoData.videoFile.playback_policy === 'signed' ||
           videoData.videoFile.playback_policy === 'drm')) {
        try {
          console.log('Video requires signed playback, fetching tokens...');
          console.log('Video file ID:', videoData.videoFile.id);
          console.log('Playback policy:', videoData.videoFile.playback_policy);

          // Fetch playback token
          const playbackResponse = await apiClient.post(
            `/video-files/${videoData.videoFile.id}/playback-token`,
            {},
            { params: { expiration_minutes: 120 } }
          );

          console.log('Playback token response:', playbackResponse.data);

          if (playbackResponse.data?.token) {
            console.log('Playback token received successfully');
            console.log('Playback token (first 50 chars):', playbackResponse.data.token.substring(0, 50) + '...');
            setPlaybackToken(playbackResponse.data.token);
          } else {
            console.error('No playback token in response:', playbackResponse.data);
          }

          // If DRM policy, also fetch DRM token
          if (videoData.videoFile.playback_policy === 'drm') {
            console.log('Video requires DRM, fetching DRM token...');

            const drmResponse = await apiClient.post(
              `/video-files/${videoData.videoFile.id}/drm-token`,
              {},
              { params: { expiration_minutes: 120 } }
            );

            console.log('DRM token response:', drmResponse.data);

            if (drmResponse.data?.drm_token) {
              console.log('DRM token received successfully');
              console.log('DRM token (first 50 chars):', drmResponse.data.drm_token.substring(0, 50) + '...');
              setDrmToken(drmResponse.data.drm_token);
            } else {
              console.error('No DRM token in response:', drmResponse.data);
            }
          } else {
            setDrmToken(null);
          }
        } catch (error) {
          console.error('Failed to fetch tokens:', error);
          // Try to continue without tokens (will likely fail playback)
          setPlaybackToken(null);
          setDrmToken(null);
        }
      } else {
        // Public playback, no tokens needed
        setPlaybackToken(null);
        setDrmToken(null);
      }
    };

    fetchTokens();
  }, [videoData?.videoFile?.id, videoData?.videoFile?.playback_policy, isAuthenticated, regionAccess.isLoading, regionAccess.isAuthorized]);

  const handleEpisodeClick = (episodeId: string) => {
    navigate(`/video/${episodeId}`);
  };

  const handleSeasonClick = (seasonId: string) => {
    navigate(`/season/${seasonId}`);
  };

  // Extract playback ID from Mux URL (based on alpha app implementation)
  const extractPlaybackId = (input: string): string | null => {
    if (!input) return null;
    
    // If it's already a playback ID (no URL structure), return as-is
    if (!input.includes('/') && !input.includes('.')) {
      return input;
    }
    
    // Extract from Mux stream URL: https://stream.mux.com/{playback_id}.m3u8
    const streamMatch = input.match(/stream\.mux\.com\/([^.]+)\.m3u8/);
    if (streamMatch) {
      return streamMatch[1];
    }
    
    // Extract from other Mux URLs
    const muxMatch = input.match(/mux\.com\/([^/?]+)/);
    if (muxMatch) {
      return muxMatch[1];
    }
    
    // Extract from the end of the URL (last segment before extension)
    const urlMatch = input.match(/\/([^/]+)\.m3u8$/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Extract the last part of the path
    const pathMatch = input.match(/\/([^/]+)$/);
    if (pathMatch) {
      return pathMatch[1];
    }
    
    return input; // Return as-is if no pattern matches
  };

  const getPlaybackId = (videoFile: VideoFile): string | null => {
    console.log('getPlaybackId called with:', {
      mux_playback_id: videoFile.mux_playback_id,
      external_url: videoFile.external_url,
      file_url: videoFile.file_url,
      mux_asset_id: videoFile.mux_asset_id
    });
    
    // First try the mux_playback_id field
    if (videoFile.mux_playback_id) {
      const id = extractPlaybackId(videoFile.mux_playback_id);
      console.log('Extracted from mux_playback_id:', id);
      return id;
    }
    
    // Then try extracting from external_url (key field from alpha app!)
    if (videoFile.external_url) {
      const id = extractPlaybackId(videoFile.external_url);
      console.log('Extracted from external_url:', id);
      return id;
    }
    
    // Then try extracting from file_url
    if (videoFile.file_url) {
      const id = extractPlaybackId(videoFile.file_url);
      console.log('Extracted from file_url:', id);
      return id;
    }
    
    // Finally try mux_asset_id as fallback
    if (videoFile.mux_asset_id) {
      console.log('Using mux_asset_id as fallback:', videoFile.mux_asset_id);
      return videoFile.mux_asset_id;
    }
    
    console.log('No playback ID found!');
    return null;
  };

  if (isResolvingMediaType || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-kyool-blue">
          {isResolvingMediaType ? 'Vérification du type de contenu...' : 'Chargement de la vidéo...'}
        </div>
      </div>
    );
  }

  if (error || !videoData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Erreur</h1>
          <p className="text-gray-300">Impossible de charger cette vidéo.</p>
        </div>
      </div>
    );
  }

  const {
    mediaDescription,
    videoFile,
    relatedEpisodes,
    season,
    program,
    actors,
    directors,
    producers,
    authors,
    audioLanguages,
    subtitleLanguages,
    originCountries
  } = videoData;
  
  const playbackId = videoFile ? getPlaybackId(videoFile) : null;
  const needsToken = videoFile?.playback_policy === 'signed' || videoFile?.playback_policy === 'drm';
  const needsDrmToken = videoFile?.playback_policy === 'drm';
  const isReadyToPlay = playbackId &&
    (!needsToken || playbackToken != null) &&
    (!needsDrmToken || drmToken != null);
  
  // Debug logging
  console.log('Video Screen Debug:', {
    videoFile,
    playbackId,
    hasVideoFile: !!videoFile,
    hasPlaybackId: !!playbackId,
    posterUrl,
    playbackPolicy: videoFile?.playback_policy,
    needsToken,
    needsDrmToken,
    hasPlaybackToken: !!playbackToken,
    hasDrmToken: !!drmToken,
    playbackTokenValue: playbackToken ? playbackToken.substring(0, 50) + '...' : null,
    drmTokenValue: drmToken ? drmToken.substring(0, 50) + '...' : null,
    isReadyToPlay,
    mediaDescription: {
      id: mediaDescription?.id,
      title: mediaDescription?.episode_title
    }
  });
  
  // Helper function to find next/previous episodes
  const getCurrentEpisodeIndex = () => {
    if (!season || !mediaDescription.episode_number) return -1;
    return relatedEpisodes.findIndex(ep => (ep.episode_number || 0) > (mediaDescription.episode_number || 0));
  };
  
  const getPreviousEpisode = () => {
    const sortedEpisodes = [...relatedEpisodes, mediaDescription]
      .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
    const currentIndex = sortedEpisodes.findIndex(ep => ep.id === mediaDescription.id);
    return currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : null;
  };
  
  const getNextEpisode = () => {
    const sortedEpisodes = [...relatedEpisodes, mediaDescription]
      .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
    const currentIndex = sortedEpisodes.findIndex(ep => ep.id === mediaDescription.id);
    return currentIndex < sortedEpisodes.length - 1 ? sortedEpisodes[currentIndex + 1] : null;
  };
  
  const previousEpisode = getPreviousEpisode();
  const nextEpisode = getNextEpisode();

  // Debug logging for episode navigation
  console.log('🎬 VideoScreen Debug:', {
    videoId: id,
    hasSeason: !!season,
    hasRelatedEpisodes: relatedEpisodes.length > 0,
    currentEpisodeNumber: mediaDescription.episode_number,
    relatedEpisodeNumbers: relatedEpisodes.map(ep => ep.episode_number),
    previousEpisode: previousEpisode?.id,
    nextEpisode: nextEpisode?.id,
    buttonCondition: !!(season && (previousEpisode || nextEpisode))
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Video Player Section */}
        <div className="mb-8">
          {!isAuthenticated ? (
            // 1. Authentication required - Show login message
            <div className="aspect-video bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center relative">
              {posterUrl && (
                <img
                  src={posterUrl}
                  alt={mediaDescription.episode_title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                <p className="text-white text-xl font-bold mt-4">
                  Connectez-vous pour lire cette vidéo.
                </p>
              </div>
            </div>
          ) : regionAccess.isLoading ? (
            // 2. Region check loading
            <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-blue-400 text-xl mb-2">Vérification de la région...</p>
                <p className="text-gray-400">Chargement en cours</p>
              </div>
            </div>
          ) : regionAccess.isAuthorized === false ? (
            // 3. Region blocked or verification failed - Show appropriate message with poster
            <div className="aspect-video bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center relative">
              {posterUrl && (
                <img
                  src={posterUrl}
                  alt={mediaDescription.episode_title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                <p className="text-white text-xl font-bold mt-4">
                  {regionAccess.error === 'region_blocked' 
                    ? "Cette vidéo n'est pas disponible dans votre région."
                    : "Impossible de vérifier votre région. Contactez le support si le problème persiste."
                  }
                </p>
              </div>
            </div>
          ) : videoFile && playbackId && isReadyToPlay ? (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {(() => {
                // Build tokens object with both playback and DRM tokens if needed
                const tokens: any = {};
                if (playbackToken) {
                  tokens.playback = playbackToken;
                }
                if (drmToken) {
                  tokens.drm = drmToken;
                }
                
                const muxPlayerProps = {
                  playbackId,
                  streamType: "on-demand",
                  style: { width: '100%', height: '100%' },
                  className: "w-full h-full",
                  ...(videoFile?.environment_key && {
                    envKey: videoFile.environment_key
                  }),
                  ...(posterUrl && {
                    poster: posterUrl
                  }),
                  // Pass tokens object if we have any tokens
                  ...(Object.keys(tokens).length > 0 && { tokens })
                };
                
                console.log('MuxPlayer props being passed:', {
                  ...muxPlayerProps,
                  tokens: muxPlayerProps.tokens ? {
                    playback: muxPlayerProps.tokens.playback ? muxPlayerProps.tokens.playback.substring(0, 50) + '...' : undefined,
                    drm: muxPlayerProps.tokens.drm ? muxPlayerProps.tokens.drm.substring(0, 50) + '...' : undefined
                  } : undefined
                });
                
                return <MuxPlayer {...muxPlayerProps} />;
              })()}
            </div>
          ) : videoFile && playbackId && needsToken && (playbackToken == null || (needsDrmToken && drmToken == null)) ? (
            <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-blue-400 text-xl mb-2">Chargement de l'autorisation...</p>
                <p className="text-gray-400">
                  {needsDrmToken
                    ? 'Récupération des tokens de lecture sécurisée et DRM'
                    : 'Récupération du token de lecture sécurisée'}
                </p>
                {needsDrmToken && (
                  <p className="text-gray-500 text-sm mt-2">
                    Playback token: {playbackToken ? '✓' : '⏳'} | DRM token: {drmToken ? '✓' : '⏳'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-center p-8">
                <p className="text-red-400 text-xl mb-2">Vidéo non disponible</p>
                <p className="text-gray-400 mb-4">
                  {!videoFile 
                    ? 'Cette vidéo n\'a pas encore été téléchargée ou associée.'
                    : !playbackId
                    ? 'ID de lecture Mux manquant - vidéo en cours de traitement.'
                    : 'Fichier vidéo invalide ou en cours de traitement.'
                  }
                </p>
                
                {/* Helpful message for missing video file */}
                {!videoFile && (
                  <div className="bg-blue-900 bg-opacity-50 p-4 rounded-lg mb-4">
                    <p className="text-blue-300 text-sm">
                      📝 Cette entrée existe dans notre catalogue mais la vidéo n'a pas encore été ajoutée.
                      <br />
                      Revenez plus tard pour voir ce contenu !
                    </p>
                  </div>
                )}
                
                {/* Debug info in development only */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-900 rounded-sm text-left">
                    <h4 className="text-gray-400 font-semibold mb-2">Debug Info (dev only):</h4>
                    <p>Media ID: {mediaDescription.id}</p>
                    <p>Title: {mediaDescription.episode_title}</p>
                    <p>Main Video File ID: {mediaDescription.main_video_file_id || 'None'}</p>
                    {videoFile && (
                      <>
                        <p>Video File ID: {videoFile.id}</p>
                        <p>Mux Asset ID: {videoFile.mux_asset_id || 'Non défini'}</p>
                        <p>Mux Playback ID: {videoFile.mux_playback_id || 'Non défini'}</p>
                        <p>URL externe: {videoFile.external_url || 'Non défini'}</p>
                        <p>URL fichier: {videoFile.file_url || 'Non défini'}</p>
                        <p>Playback ID extrait: {playbackId || 'Non défini'}</p>
                        <p>Statut encodage: {videoFile.encoding_status}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Episode Navigation Buttons */}
        {season && (previousEpisode || nextEpisode) && (
          <div className="flex justify-between mb-6">
            {previousEpisode ? (
              <button
                onClick={() => handleEpisodeClick(previousEpisode.id)}
                className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white"
              >
                <span className="mr-2">←</span>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Épisode précédent</div>
                  <div className="text-sm">
                    {previousEpisode.episode_number && `Ép. ${previousEpisode.episode_number}: `}
                    {previousEpisode.episode_title}
                  </div>
                </div>
              </button>
            ) : (
              <div></div>
            )}
            
            {nextEpisode && (
              <button
                onClick={() => handleEpisodeClick(nextEpisode.id)}
                className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white"
              >
                <div className="text-right">
                  <div className="text-xs text-gray-400">Épisode suivant</div>
                  <div className="text-sm">
                    {nextEpisode.episode_number && `Ép. ${nextEpisode.episode_number}: `}
                    {nextEpisode.episode_title}
                  </div>
                </div>
                <span className="ml-2">→</span>
              </button>
            )}
          </div>
        )}

        {/* Video Information Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-kyool-blue mb-4">
            {mediaDescription.episode_title}
          </h1>
          
          {/* Season and Episode Info */}
          {season && mediaDescription.episode_number && (
            <div className="mb-6">
              <button
                onClick={() => handleSeasonClick(season.id)}
                className="text-xl text-gray-300 hover:text-kyool-blue transition-colors cursor-pointer"
              >
                {season.season_name} - Épisode {mediaDescription.episode_number}
              </button>
            </div>
          )}

          {/* Crew Section */}
          {(actors.length > 0 || directors.length > 0 || producers.length > 0 || authors.length > 0) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-kyool-blue mb-3">Distribution et équipe</h3>
              <div className="space-y-2 text-sm">
                {producers.length > 0 && (
                  <div>
                    <span className="text-gray-400">Producteur{producers.length > 1 ? 's' : ''}: </span>
                    <span className="text-white">
                      {producers.map(p => p.stage_name_roman || `${p.first_name_roman || ''} ${p.last_name_roman || ''}`.trim()).join(', ')}
                    </span>
                  </div>
                )}
                {directors.length > 0 && (
                  <div>
                    <span className="text-gray-400">Réalisateur{directors.length > 1 ? 's' : ''}: </span>
                    <span className="text-white">
                      {directors.map(d => d.stage_name_roman || `${d.first_name_roman || ''} ${d.last_name_roman || ''}`.trim()).join(', ')}
                    </span>
                  </div>
                )}
                {authors.length > 0 && (
                  <div>
                    <span className="text-gray-400">Auteur{authors.length > 1 ? 's' : ''}: </span>
                    <span className="text-white">
                      {authors.map(a => a.stage_name_roman || `${a.first_name_roman || ''} ${a.last_name_roman || ''}`.trim()).join(', ')}
                    </span>
                  </div>
                )}
                {actors.length > 0 && (
                  <div>
                    <span className="text-gray-400">Acteur{actors.length > 1 ? 's' : ''}: </span>
                    <span className="text-white">
                      {actors.map(a => a.stage_name_roman || `${a.first_name_roman || ''} ${a.last_name_roman || ''}`.trim()).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Synopsis */}
          {mediaDescription.synopsis_text && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-kyool-blue mb-2">Synopsis</h3>
              <p className="text-gray-300 leading-relaxed">
                {mediaDescription.synopsis_text}
              </p>
            </div>
          )}

          {/* Description Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-kyool-blue mb-3">Description</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {mediaDescription.media_categories_list?.length > 0 && (
                <div>
                  <span className="text-gray-400">Catégories: </span>
                  <span className="text-white">{mediaDescription.media_categories_list.join(', ')}</span>
                </div>
              )}
              {(mediaDescription.media_themes?.length || mediaDescription.media_themes_id_list?.length) && (
                <div>
                  <span className="text-gray-400">Thèmes: </span>
                  <span className="text-white">
                    {mediaDescription.media_themes?.map(theme => theme.name).join(', ') ||
                     mediaDescription.media_themes_id_list?.join(', ')}
                  </span>
                </div>
              )}
              {mediaDescription.production_year && (
                <div>
                  <span className="text-gray-400">Année de production: </span>
                  <span className="text-white">{mediaDescription.production_year}</span>
                </div>
              )}
              {mediaDescription.audience_categories?.length > 0 && (
                <div>
                  <span className="text-gray-400">Catégories d'audience: </span>
                  <span className="text-white">
                    {mediaDescription.audience_categories.map(cat => cat.name).join(', ')}
                  </span>
                </div>
              )}
              {audioLanguages.length > 0 && (
                <div>
                  <span className="text-gray-400">Langues audio disponibles: </span>
                  <span className="text-white">{audioLanguages.map(lang => lang.name).join(', ')}</span>
                </div>
              )}
              {subtitleLanguages.length > 0 && (
                <div>
                  <span className="text-gray-400">Sous-titres disponibles: </span>
                  <span className="text-white">{subtitleLanguages.map(lang => lang.name).join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Detail Section */}
          {(mediaDescription.original_broadcast_date_utc || mediaDescription.rights_holder ||
            mediaDescription.original_languages?.length || originCountries.length > 0 ||
            mediaDescription.duration_seconds) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-kyool-blue mb-3">Détails</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {mediaDescription.original_broadcast_date_utc && (
                  <div>
                    <span className="text-gray-400">Diffusion originale: </span>
                    <span className="text-white">
                      {new Date(mediaDescription.original_broadcast_date_utc).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
                {mediaDescription.rights_holder && (
                  <div>
                    <span className="text-gray-400">Détenteur des droits: </span>
                    <span className="text-white">{mediaDescription.rights_holder}</span>
                  </div>
                )}
                {mediaDescription.original_languages?.length > 0 && (
                  <div>
                    <span className="text-gray-400">Langue originale: </span>
                    <span className="text-white">
                      {mediaDescription.original_languages.map(lang => lang.name).join(', ')}
                    </span>
                  </div>
                )}
                {originCountries.length > 0 && (
                  <div>
                    <span className="text-gray-400">Pays d'origine: </span>
                    <span className="text-white">{originCountries.map(country => country.name).join(', ')}</span>
                  </div>
                )}
                {mediaDescription.human_keywords_text_list?.length > 0 && (
                  <div>
                    <span className="text-gray-400">Tags: </span>
                    <span className="text-white">
                      {mediaDescription.human_keywords_text_list.join(', ')}
                    </span>
                  </div>
                )}
                {mediaDescription.hashtags_text_list?.length > 0 && (
                  <div>
                    <span className="text-gray-400">Hashtags: </span>
                    <span className="text-white">
                      {mediaDescription.hashtags_text_list.map(tag => `#${tag}`).join(' ')}
                    </span>
                  </div>
                )}
                {mediaDescription.duration_seconds && (
                  <div>
                    <span className="text-gray-400">Durée: </span>
                    <span className="text-white">{Math.floor(mediaDescription.duration_seconds / 60)} minutes</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Section - Hidden from display */}
          {/*
          {(mediaDescription.seo_title || mediaDescription.seo_description ||
            mediaDescription.seo_keywords_text_list?.length ||
            mediaDescription.available_countries?.length || mediaDescription.eligible_plans?.length ||
            mediaDescription.is_featured !== undefined || mediaDescription.paid_token_cost !== undefined) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-kyool-blue mb-3">Informations internes</h3>
              <div className="space-y-3">
                {/* SEO Subsection *\/}
                {(mediaDescription.seo_title || mediaDescription.seo_description || mediaDescription.seo_keywords_text_list?.length) && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-300 mb-2">SEO</h4>
                    <div className="grid grid-cols-1 gap-2 text-sm pl-4">
                      {mediaDescription.seo_title && (
                        <div>
                          <span className="text-gray-400">Titre SEO: </span>
                          <span className="text-white">{mediaDescription.seo_title}</span>
                        </div>
                      )}
                      {mediaDescription.seo_description && (
                        <div>
                          <span className="text-gray-400">Description SEO: </span>
                          <span className="text-white">{mediaDescription.seo_description}</span>
                        </div>
                      )}
                      {mediaDescription.seo_keywords_text_list?.length > 0 && (
                        <div>
                          <span className="text-gray-400">Mots-clés SEO: </span>
                          <span className="text-white">{mediaDescription.seo_keywords_text_list.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Other Internal Info *\/}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {mediaDescription.available_countries?.length > 0 && (
                    <div>
                      <span className="text-gray-400">Pays disponibles: </span>
                      <span className="text-white">
                        {mediaDescription.available_countries.map(country => country.name).join(', ')}
                      </span>
                    </div>
                  )}
                  {mediaDescription.eligible_plans?.length > 0 && (
                    <div>
                      <span className="text-gray-400">Plans éligibles: </span>
                      <span className="text-white">
                        {mediaDescription.eligible_plans.map(plan => plan.name).join(', ')}
                      </span>
                    </div>
                  )}
                  {mediaDescription.is_featured !== undefined && (
                    <div>
                      <span className="text-gray-400">Contenu vedette: </span>
                      <span className="text-white">{mediaDescription.is_featured ? 'Oui' : 'Non'}</span>
                    </div>
                  )}
                  {mediaDescription.paid_token_cost !== undefined && (
                    <div>
                      <span className="text-gray-400">Coût en tokens: </span>
                      <span className="text-white">{mediaDescription.paid_token_cost}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          */}

          {/* Descriptive Summary - Hidden from display */}
          {/*
          {mediaDescription.descriptive_summary_text && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-kyool-blue mb-2">Résumé descriptif</h3>
              <p className="text-gray-300 leading-relaxed">
                {mediaDescription.descriptive_summary_text}
              </p>
            </div>
          )}
          */}
        </div>

        {/* Other Episodes Section - Hidden for now, logic kept for navigation buttons */}
        {/* {relatedEpisodes.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-kyool-blue mb-4">
              {season ? `Autres épisodes de la saison ${season.season_number}` : 'Autres épisodes'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedEpisodes.map((episode) => (
                <div
                  key={episode.id}
                  onClick={() => handleEpisodeClick(episode.id)}
                  className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  {episode.image_1920_1080_url ? (
                    <img
                      src={episode.image_1920_1080_url}
                      alt={episode.episode_title}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-600 flex items-center justify-center">
                      <span className="text-gray-400">Pas d'image</span>
                    </div>
                  )}

                  <div className="p-3">
                    <h4 className="font-semibold text-white text-sm mb-1 truncate">
                      {episode.episode_number && `Ép. ${episode.episode_number}: `}
                      {episode.episode_title}
                    </h4>
                    {episode.duration_seconds && (
                      <p className="text-gray-400 text-xs">
                        {Math.floor(episode.duration_seconds / 60)} min
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default VideoScreen;