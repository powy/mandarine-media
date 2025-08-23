import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MuxPlayer from '@mux/mux-player-react';
import { getVideoScreenData } from 'share';
import type { MediaDescription, VideoFile, Program, Season } from 'share';

interface VideoScreenData {
  mediaDescription: MediaDescription;
  videoFile: VideoFile | null;
  relatedEpisodes: MediaDescription[];
  season: Season | null;
  program: Program | null;
  hasRelatedContent: boolean;
}

const VideoScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: videoData,
    isLoading,
    error,
  } = useQuery<VideoScreenData>({
    queryKey: ['video-screen', id],
    queryFn: () => {
      if (!id) throw new Error('Video ID is required');
      return getVideoScreenData(id);
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (error) {
      // Redirect to error page for invalid IDs
      navigate('/error', { replace: true });
    }
  }, [error, navigate]);

  const handleEpisodeClick = (episodeId: string) => {
    navigate(`/video/${episodeId}`);
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
    // First try the mux_playback_id field
    if (videoFile.mux_playback_id) {
      return extractPlaybackId(videoFile.mux_playback_id);
    }
    
    // Then try extracting from external_url (key field from alpha app!)
    if (videoFile.external_url) {
      return extractPlaybackId(videoFile.external_url);
    }
    
    // Then try extracting from file_url
    if (videoFile.file_url) {
      return extractPlaybackId(videoFile.file_url);
    }
    
    // Finally try mux_asset_id as fallback
    if (videoFile.mux_asset_id) {
      return videoFile.mux_asset_id;
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-kyool-blue">Chargement de la vidéo...</div>
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

  const { mediaDescription, videoFile, relatedEpisodes, season, program } = videoData;
  const playbackId = videoFile ? getPlaybackId(videoFile) : null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Video Player Section */}
        <div className="mb-8">
          {videoFile && playbackId ? (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <MuxPlayer
                playbackId={playbackId}
                streamType="on-demand"
                style={{ width: '100%', height: '100%' }}
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-400 text-xl mb-2">Erreur de lecture</p>
                <p className="text-gray-400">
                  {!videoFile 
                    ? 'Aucun fichier vidéo associé trouvé'
                    : !playbackId
                    ? 'ID de lecture Mux manquant'
                    : 'Fichier vidéo invalide ou manquant'
                  }
                </p>
                {/* Debug info */}
                {videoFile && (
                  <div className="text-xs text-gray-500 mt-2">
                    <p>Fichier ID: {videoFile.id}</p>
                    <p>Mux Asset ID: {videoFile.mux_asset_id || 'Non défini'}</p>
                    <p>Mux Playback ID: {videoFile.mux_playback_id || 'Non défini'}</p>
                    <p>URL externe: {videoFile.external_url || 'Non défini'}</p>
                    <p>URL fichier: {videoFile.file_url || 'Non défini'}</p>
                    <p>Playback ID extrait: {playbackId || 'Non défini'}</p>
                    <p>Statut encodage: {videoFile.encoding_status}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Video Information Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-kyool-blue mb-4">
            {mediaDescription.episode_title}
          </h1>
          
          {/* Program and Season Info */}
          {program && (
            <div className="mb-4">
              <h2 className="text-xl text-gray-300">
                {program.program_name}
                {season && ` - Saison ${season.season_number}`}
                {mediaDescription.episode_number && ` - Épisode ${mediaDescription.episode_number}`}
              </h2>
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

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {mediaDescription.duration_seconds && (
              <div>
                <span className="text-gray-400">Durée: </span>
                <span className="text-white">
                  {Math.floor(mediaDescription.duration_seconds / 60)} minutes
                </span>
              </div>
            )}
            {mediaDescription.production_year && (
              <div>
                <span className="text-gray-400">Année: </span>
                <span className="text-white">{mediaDescription.production_year}</span>
              </div>
            )}
          </div>
        </div>

        {/* Related Episodes Section */}
        {relatedEpisodes.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-kyool-blue mb-4">
              Autres épisodes
              {season && ` de la saison ${season.season_number}`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedEpisodes.map((episode) => (
                <div
                  key={episode.id}
                  onClick={() => handleEpisodeClick(episode.id)}
                  className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  {/* Episode Thumbnail */}
                  {episode.main_thumbnail_url ? (
                    <img
                      src={episode.main_thumbnail_url}
                      alt={episode.episode_title}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-600 flex items-center justify-center">
                      <span className="text-gray-400">Pas d'image</span>
                    </div>
                  )}
                  
                  {/* Episode Info */}
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
        )}
      </div>
    </div>
  );
};

export default VideoScreen;