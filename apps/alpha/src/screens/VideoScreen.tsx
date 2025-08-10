import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { AppLayout } from '../components/AppLayout';
import MuxPlayerViewBuiltIn from '../components/MuxPlayerViewBuiltIn';
import { mediaApi, seasonsApi } from 'share';
import type { MediaDescription, VideoFile, Season, MediaDescription as EpisodeMedia } from 'share';

type Props = NativeStackScreenProps<RootStackParamList, 'Video'>;

// Helper function to extract Mux playback ID from various URL formats
function extractMuxPlaybackId(input: string): string | null {
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
}

interface VideoScreenState {
  media: MediaDescription | null;
  videoFile: VideoFile | null;
  playbackId: string | null;
  seasonEpisodes: EpisodeMedia[];
  season: Season | null;
  isLoading: boolean;
  error: string | null;
  videoPlayerError: boolean;
}

export const VideoScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mediaId } = route.params;
  
  const [state, setState] = useState<VideoScreenState>({
    media: null,
    videoFile: null,
    playbackId: null,
    seasonEpisodes: [],
    season: null,
    isLoading: true,
    error: null,
    videoPlayerError: false,
  });

  useEffect(() => {
    loadVideoData();
  }, [mediaId]);

  const loadVideoData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      console.log('VideoScreen: Loading media with ID:', mediaId);
      const media = await mediaApi.getMediaDescription(mediaId);
      console.log('VideoScreen: Media loaded:', media);
      
      if (media.media_type !== 'video') {
        navigation.replace('Error', { 
          message: 'The selected content is not a video file.' 
        });
        return;
      }

      console.log('VideoScreen: Fetching video files for media ID:', mediaId);
      const videoFiles = await mediaApi.getVideoFilesByMedia(mediaId);
      console.log('VideoScreen: Video files response:', videoFiles);
      console.log('VideoScreen: Number of video files:', videoFiles?.length || 0);
      
      const videoFile = videoFiles[0];
      console.log('VideoScreen: First video file:', videoFile);

      // Extract playback ID from Mux URL if needed
      let playbackId = null;
      if (videoFile?.mux_playback_id) {
        playbackId = extractMuxPlaybackId(videoFile.mux_playback_id);
        console.log('VideoScreen: Extracted playback ID from mux_playback_id:', playbackId);
      } else if (videoFile?.external_url) {
        playbackId = extractMuxPlaybackId(videoFile.external_url);
        console.log('VideoScreen: Extracted playback ID from external_url:', playbackId);
      } else if (videoFile?.file_url) {
        playbackId = extractMuxPlaybackId(videoFile.file_url);
        console.log('VideoScreen: Extracted playback ID from file_url:', playbackId);
      }
      
      console.log('VideoScreen: Final playback ID to use:', playbackId);

      let season = null;
      let seasonEpisodes: EpisodeMedia[] = [];

      if (media.season_id) {
        try {
          season = await seasonsApi.getById(media.season_id);
          const allSeasonEpisodes = await mediaApi.getMediaDescriptions({
            skip: 0,
            limit: 100,
          });
          
          seasonEpisodes = allSeasonEpisodes.data.filter(episode => 
            episode.season_id === media.season_id &&
            episode.media_type === 'video' &&
            episode.id !== mediaId
          ).sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
        } catch (error) {
          console.warn('Failed to load season data:', error);
        }
      }

      setState({
        media,
        videoFile,
        playbackId,
        seasonEpisodes,
        season,
        isLoading: false,
        error: null,
        videoPlayerError: !playbackId,
      });

    } catch (error) {
      console.error('VideoScreen: Error loading video data:', error);
      console.error('VideoScreen: Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to load video data';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('VideoScreen: API Error Status:', axiosError.response?.status);
        console.error('VideoScreen: API Error Data:', axiosError.response?.data);
        errorMessage = axiosError.response?.data?.message || axiosError.message || 'API call failed';
      }
      
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        navigation.replace('Error', { 
          message: `Video not found (ID: ${mediaId}). The content may have been removed or you may not have access to it.` 
        });
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `${errorMessage} (ID: ${mediaId})`,
        }));
      }
    }
  };

  const navigateToEpisode = (episodeId: string, episodeTitle: string) => {
    Alert.alert(
      'Switch Episode',
      `Switch to "${episodeTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Switch', 
          onPress: () => navigation.replace('Video', { mediaId: episodeId })
        }
      ]
    );
  };

  const handleRetry = () => {
    loadVideoData();
  };

  if (state.isLoading) {
    return (
      <AppLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4DA6FF" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      </AppLayout>
    );
  }

  if (state.error) {
    return (
      <AppLayout>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  const { media, videoFile, playbackId, seasonEpisodes, season, videoPlayerError } = state;

  if (!media) {
    return (
      <AppLayout>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Media not available</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Player Section with Mux Built-in Controls */}
        {playbackId && !videoPlayerError ? (
          <MuxPlayerViewBuiltIn
            playbackId={playbackId}
            title={media.episode_title}
            videoId={media.id}
            autoPlay={false}
            muted={true}
            aspectRatio={16 / 9}
            showControls={true}
            enableFullscreen={true}
            enableSeek={true}
            enableSubtitles={true}
            enableChromecast={true}
            playbackSpeed={1}
            maximumResolution="1080p"
            onFullscreenChange={(event) => {
              console.log('Fullscreen changed:', event.nativeEvent.isFullscreen);
            }}
            onSeek={(event) => {
              console.log('Seek to:', event.nativeEvent.seekTime);
            }}
            onPlaybackSpeedChange={(event) => {
              console.log('Playback speed changed to:', event.nativeEvent.playbackSpeed);
            }}
            onProgress={(event) => {
              // Handle progress updates if needed
              // console.log('Progress:', event.nativeEvent);
            }}
          />
        ) : (
          <View style={styles.videoErrorContainer}>
            <Text style={styles.videoErrorText}>
              {videoPlayerError ? 'Video not available for streaming' : 'Loading video...'}
            </Text>
          </View>
        )}
        
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{media.episode_title}</Text>
          
          {media.synopsis_text && (
            <Text style={styles.synopsis}>{media.synopsis_text}</Text>
          )}

          {season && seasonEpisodes.length > 0 && (
            <View style={styles.episodesSection}>
              <Text style={styles.sectionTitle}>
                Other Episodes ({seasonEpisodes.length})
              </Text>
              
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.episodesScrollView}
              >
                {seasonEpisodes.map((episode) => (
                  <TouchableOpacity
                    key={episode.id}
                    style={styles.episodeItem}
                    onPress={() => navigateToEpisode(episode.id, episode.episode_title)}
                  >
                    <View style={styles.episodeThumbnail}>
                      <Text style={styles.episodeNumber}>
                        {episode.episode_number || '?'}
                      </Text>
                    </View>
                    <Text style={styles.episodeTitle} numberOfLines={2}>
                      {episode.episode_title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#4DA6FF',
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#4DA6FF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#4DA6FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backText: {
    color: '#4DA6FF',
    fontSize: 16,
    fontWeight: '500',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    color: '#4DA6FF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 30,
  },
  synopsis: {
    color: '#CCC',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  episodesSection: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#4DA6FF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  episodesScrollView: {
    paddingVertical: 4,
  },
  episodeItem: {
    marginRight: 16,
    width: 140,
  },
  episodeThumbnail: {
    width: 140,
    height: 80,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  episodeNumber: {
    color: '#4DA6FF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  episodeTitle: {
    color: '#4DA6FF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomSpacing: {
    height: 40,
  },
  videoErrorContainer: {
    width: screenWidth,
    height: screenWidth / (16 / 9),
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#4DA6FF',
  },
  videoErrorText: {
    color: '#4DA6FF',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});