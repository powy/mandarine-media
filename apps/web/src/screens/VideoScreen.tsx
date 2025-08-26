import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MuxPlayer from '@mux/mux-player-react';
import { getVideoScreenData } from 'share';
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
  audioLanguages: Language[];
  subtitleLanguages: Language[];
  originCountries: Country[];
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

  // Debug log for Mux metrics activation
  useEffect(() => {
    if (videoData?.videoFile?.environment_key) {
      console.log('Mux metrics will be activated with environment_key:', videoData.videoFile.environment_key);
    } else if (videoData) {
      console.log('No environment_key found - Mux metrics will not be activated to avoid errors');
    }
  }, [videoData?.videoFile?.environment_key]);

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

  const { 
    mediaDescription, 
    videoFile, 
    relatedEpisodes, 
    season, 
    program, 
    actors, 
    directors, 
    producers, 
    audioLanguages, 
    subtitleLanguages, 
    originCountries 
  } = videoData;
  
  const playbackId = videoFile ? getPlaybackId(videoFile) : null;
  
  
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
                {...(videoFile?.environment_key && {
                  envKey: videoFile.environment_key
                })}
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
          
          {/* Program and Season Info */}
          {program && (
            <div className="mb-6">
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

          {/* Details Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-kyool-blue mb-3">Détails</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {mediaDescription.themes_and_genres_id_list?.length && (
                <div>
                  <span className="text-gray-400">Genres: </span>
                  <span className="text-white">
                    {mediaDescription.themes_and_genres_id_list.join(', ')}
                  </span>
                </div>
              )}
              {audioLanguages.length > 0 && (
                <div>
                  <span className="text-gray-400">Langues audio: </span>
                  <span className="text-white">
                    {audioLanguages.map(lang => lang.name).join(', ')}
                  </span>
                </div>
              )}
              {subtitleLanguages.length > 0 && (
                <div>
                  <span className="text-gray-400">Sous-titres: </span>
                  <span className="text-white">
                    {subtitleLanguages.map(lang => lang.name).join(', ')}
                  </span>
                </div>
              )}
              {mediaDescription.production_year && (
                <div>
                  <span className="text-gray-400">Année: </span>
                  <span className="text-white">{mediaDescription.production_year}</span>
                </div>
              )}
              {originCountries.length > 0 && (
                <div>
                  <span className="text-gray-400">Pays d'origine: </span>
                  <span className="text-white">
                    {originCountries.map(country => country.name).join(', ')}
                  </span>
                </div>
              )}
              {mediaDescription.duration_seconds && (
                <div>
                  <span className="text-gray-400">Durée: </span>
                  <span className="text-white">
                    {Math.floor(mediaDescription.duration_seconds / 60)} minutes
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Cast and Crew Section */}
          {(actors.length > 0 || directors.length > 0 || producers.length > 0) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-kyool-blue mb-3">Distribution et équipe</h3>
              <p className="text-gray-300 leading-relaxed">
                {producers.length > 0 && (
                  <span>
                    <span className="text-gray-400">Producteur{producers.length > 1 ? 's' : ''}: </span>
                    <span className="text-white">
                      {producers.map(p => p.stage_name_roman || `${p.first_name_roman || ''} ${p.last_name_roman || ''}`).join(', ')}
                    </span>
                    {(directors.length > 0 || actors.length > 0) && ', '}
                  </span>
                )}
                {directors.length > 0 && (
                  <span>
                    <span className="text-gray-400">Réalisateur{directors.length > 1 ? 's' : ''}: </span>
                    <span className="text-white">
                      {directors.map(d => d.stage_name_roman || `${d.first_name_roman || ''} ${d.last_name_roman || ''}`).join(', ')}
                    </span>
                    {actors.length > 0 && ', '}
                  </span>
                )}
                {actors.length > 0 && (
                  <span>
                    <span className="text-gray-400">avec </span>
                    <span className="text-white">
                      {actors.map(a => a.stage_name_roman || `${a.first_name_roman || ''} ${a.last_name_roman || ''}`).join(', ')}
                    </span>
                    <span className="text-gray-400"> (acteur{actors.length > 1 ? 's' : ''})</span>
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Description */}
          {mediaDescription.descriptive_summary_text && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-kyool-blue mb-2">Description</h3>
              <p className="text-gray-300 leading-relaxed">
                {mediaDescription.descriptive_summary_text}
              </p>
            </div>
          )}
        </div>

        {/* Other Episodes Section */}
        {relatedEpisodes.length > 0 && (
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