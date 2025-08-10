import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  requireNativeComponent,
} from 'react-native';
import type { MuxPlayerViewProps } from '../types/MuxPlayerView';

const { width: screenWidth } = Dimensions.get('window');

const NativeMuxPlayerView = requireNativeComponent<MuxPlayerViewProps>('MuxPlayerView');

interface MuxPlayerBuiltInProps {
  playbackId: string;
  title?: string;
  videoId?: string;
  autoPlay?: boolean;
  muted?: boolean;
  aspectRatio?: number;
  showControls?: boolean;
  enableFullscreen?: boolean;
  enableSeek?: boolean;
  enableSubtitles?: boolean;
  playbackSpeed?: number;
  enableChromecast?: boolean;
  maximumResolution?: string;
  onLoad?: (event: { nativeEvent: { type: string } }) => void;
  onError?: (event: { nativeEvent: { error: string } }) => void;
  onProgress?: (event: { nativeEvent: { currentTime: number; duration: number } }) => void;
  onEnd?: (event: { nativeEvent: { type: string } }) => void;
  onFullscreenChange?: (event: { nativeEvent: { isFullscreen: boolean } }) => void;
  onSeek?: (event: { nativeEvent: { seekTime: number } }) => void;
  onPlaybackSpeedChange?: (event: { nativeEvent: { playbackSpeed: number } }) => void;
}

/**
 * MuxPlayerView using Mux's built-in controls
 * 
 * This component leverages Mux Player's native controls instead of custom overlays:
 * - iOS: Uses AVPlayerViewController with Mux Player Swift SDK
 * - Android: Uses Media3 PlayerView with Mux Player Android SDK
 * 
 * Features provided by built-in controls:
 * - Native fullscreen experience
 * - Platform-specific UI patterns
 * - Automatic subtitle/caption detection and display
 * - Built-in seek controls with scrubbing
 * - Native playback speed controls (platform dependent)
 * - Accessibility support
 * - Picture-in-picture (iOS)
 * - Chromecast integration (when configured)
 */
const MuxPlayerViewBuiltIn: React.FC<MuxPlayerBuiltInProps> = ({
  playbackId,
  title = 'Video',
  videoId,
  autoPlay = false,
  muted = true,
  aspectRatio = 16 / 9,
  showControls = true,
  enableFullscreen = true,
  enableSeek = true,
  enableSubtitles = true,
  playbackSpeed = 1,
  enableChromecast = true,
  maximumResolution = 'default',
  onLoad,
  onError,
  onProgress,
  onEnd,
  onFullscreenChange,
  onSeek,
  onPlaybackSpeedChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoHeight = screenWidth / aspectRatio;

  const handleLoad = (event: { nativeEvent: { type: string } }) => {
    setLoading(false);
    setError(null);
    console.log('MuxPlayerView: Video loaded', event.nativeEvent);
    onLoad?.(event);
  };

  const handleError = (event: { nativeEvent: { error: string } }) => {
    setLoading(false);
    setError(event.nativeEvent.error);
    console.error('MuxPlayerView: Video error', event.nativeEvent.error);
    onError?.(event);
  };

  const handleProgress = (event: { nativeEvent: { currentTime: number; duration: number } }) => {
    onProgress?.(event);
  };

  const handleEnd = (event: { nativeEvent: { type: string } }) => {
    console.log('MuxPlayerView: Video ended', event.nativeEvent);
    onEnd?.(event);
  };

  const handleFullscreenChange = (event: { nativeEvent: { isFullscreen: boolean } }) => {
    console.log('MuxPlayerView: Fullscreen changed', event.nativeEvent.isFullscreen);
    onFullscreenChange?.(event);
  };

  const handleSeek = (event: { nativeEvent: { seekTime: number } }) => {
    console.log('MuxPlayerView: Seek to', event.nativeEvent.seekTime);
    onSeek?.(event);
  };

  const handlePlaybackSpeedChange = (event: { nativeEvent: { playbackSpeed: number } }) => {
    console.log('MuxPlayerView: Playback speed changed to', event.nativeEvent.playbackSpeed);
    onPlaybackSpeedChange?.(event);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  if (error) {
    return (
      <View style={[styles.container, { height: videoHeight }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: videoHeight }]}>
      <NativeMuxPlayerView
        style={[styles.player, { height: videoHeight }]}
        playbackId={playbackId}
        title={title}
        videoId={videoId || playbackId}
        autoPlay={autoPlay}
        muted={muted}
        showControls={showControls}
        enableFullscreen={enableFullscreen}
        enableSeek={enableSeek}
        enableSubtitles={enableSubtitles}
        playbackSpeed={playbackSpeed}
        enableChromecast={enableChromecast}
        maximumResolution={maximumResolution}
        onLoad={handleLoad}
        onError={handleError}
        onProgress={handleProgress}
        onEnd={handleEnd}
        onFullscreenChange={handleFullscreenChange}
        onSeek={handleSeek}
        onPlaybackSpeedChange={handlePlaybackSpeedChange}
      />
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4DA6FF" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    position: 'relative',
    width: screenWidth,
  },
  player: {
    width: screenWidth,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  retryButton: {
    backgroundColor: '#4DA6FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MuxPlayerViewBuiltIn;