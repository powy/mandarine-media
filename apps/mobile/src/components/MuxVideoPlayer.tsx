import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import muxReactNativeVideo from '@mux/mux-data-react-native-video';

const { width: screenWidth } = Dimensions.get('window');

// Create enhanced Video component with Mux analytics
const MuxVideo = muxReactNativeVideo(Video);

interface MuxVideoPlayerProps {
  playbackId: string;
  title?: string;
  videoId?: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  aspectRatio?: number;
}

const MuxVideoPlayer: React.FC<MuxVideoPlayerProps> = ({
  playbackId,
  title = 'Video',
  videoId,
  poster,
  autoPlay = false,
  muted = true,
  controls = true,
  aspectRatio = 16 / 9,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(!autoPlay);
  const videoRef = useRef<VideoRef>(null);

  const videoHeight = screenWidth / aspectRatio;
  
  // Construct Mux stream URL
  const streamUrl = `https://stream.mux.com/${playbackId}.m3u8`;
  
  // Construct poster URL if not provided
  const posterUrl = poster || `https://image.mux.com/${playbackId}/thumbnail.jpg`;

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = (error: any) => {
    setLoading(false);
    setError('Failed to load video. Please try again.');
    console.error('Video error:', error);
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const togglePlayPause = () => {
    setPaused(!paused);
  };

  const muxOptions = {
    application_name: 'Kyool Mobile App',
    application_version: '1.0.0',
    data: {
      env_key: 'mux-data-env-key', // Replace with actual environment key if you have one
      video_id: videoId || playbackId,
      video_title: title,
      player_name: Platform.OS === 'android' ? 'Android Mux Player' : 'iOS Mux Player',
      player_software_version: '6.16.1',
    },
  };

  if (error) {
    return (
      <View style={[styles.container, { height: videoHeight }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setError(null);
              setLoading(true);
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: videoHeight }]}>
      <MuxVideo
        ref={videoRef}
        source={{ uri: streamUrl }}
        style={[styles.video, { height: videoHeight }]}
        controls={controls}
        paused={paused}
        muted={muted}
        resizeMode="contain"
        onLoad={handleLoad}
        onError={handleError}
        onLoadStart={handleLoadStart}
        poster={posterUrl}
        posterResizeMode="cover"
        muxOptions={muxOptions}
        // Android-specific optimizations
        bufferConfig={{
          minBufferMs: 15000,
          maxBufferMs: 50000,
          bufferForPlaybackMs: 2500,
          bufferForPlaybackAfterRebufferMs: 5000,
        }}
        // iOS-specific optimizations
        preferredForwardBufferDuration={30}
        playWhenInactive={false}
        playInBackground={false}
        ignoreSilentSwitch="ignore"
      />
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00BFFF" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}

      {/* Custom controls overlay (if needed for Android-specific behavior) */}
      {Platform.OS === 'android' && !controls && (
        <TouchableOpacity
          style={styles.playPauseOverlay}
          onPress={togglePlayPause}
          activeOpacity={0.7}
        >
          <Text style={styles.playPauseText}>
            {paused ? '▶️' : '⏸️'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    position: 'relative',
    width: screenWidth,
  },
  video: {
    width: screenWidth,
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#00BFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  playPauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playPauseText: {
    fontSize: 48,
  },
});

export default MuxVideoPlayer;