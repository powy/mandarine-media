import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  requireNativeComponent,
  Modal,
  FlatList,
  Animated,
  PanResponder,
} from 'react-native';
import type { MuxPlayerViewProps, SubtitleTrack, PlaybackSpeedOption } from '../types/MuxPlayerView';

const { width: screenWidth } = Dimensions.get('window');

const NativeMuxPlayerView = requireNativeComponent<MuxPlayerViewProps>('MuxPlayerView');

interface MuxPlayerComponentProps {
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
  subtitleTracks?: SubtitleTrack[];
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onSeek?: (seekTime: number) => void;
  onPlaybackSpeedChange?: (playbackSpeed: number) => void;
}

const PLAYBACK_SPEED_OPTIONS: PlaybackSpeedOption[] = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 1.75, label: '1.75x' },
  { value: 2, label: '2x' },
];

const MuxPlayerView: React.FC<MuxPlayerComponentProps> = ({
  playbackId,
  title = 'Video',
  videoId,
  autoPlay = false,
  muted = true,
  aspectRatio = 16 / 9,
  showControls: showControlsProps = true,
  enableFullscreen = true,
  enableSeek = true,
  enableSubtitles = true,
  playbackSpeed = 1,
  enableChromecast = true,
  subtitleTracks = [],
  onFullscreenChange,
  onSeek,
  onPlaybackSpeedChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControlsOverlay, setShowControlsOverlay] = useState(showControlsProps);
  const [selectedSubtitle, setSelectedSubtitle] = useState<SubtitleTrack | null>(null);
  const [currentPlaybackSpeed, setCurrentPlaybackSpeed] = useState(playbackSpeed);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [showSubtitleModal, setShowSubtitleModal] = useState(false);
  
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const videoHeight = screenWidth / aspectRatio;

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (showControlsOverlay && showControlsProps) {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      controlsTimeout.current = setTimeout(() => {
        hideControlsOverlay();
      }, 3000);
    }
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [showControlsOverlay, isPlaying, showControlsProps]);

  const showControlsOverlayFunction = () => {
    setShowControlsOverlay(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideControlsOverlay = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowControlsOverlay(false);
    });
  };

  const toggleControls = () => {
    if (showControlsOverlay) {
      hideControlsOverlay();
    } else {
      showControlsOverlayFunction();
    }
  };

  const handleLoad = (event: { nativeEvent: { type: string } }) => {
    setLoading(false);
    setError(null);
    console.log('MuxPlayerView: Video loaded', event.nativeEvent);
  };

  const handleError = (event: { nativeEvent: { error: string } }) => {
    setLoading(false);
    setError(event.nativeEvent.error);
    console.error('MuxPlayerView: Video error', event.nativeEvent.error);
  };

  const handleProgress = (event: { nativeEvent: { currentTime: number; duration: number } }) => {
    setCurrentTime(event.nativeEvent.currentTime);
    setDuration(event.nativeEvent.duration);
  };

  const handleEnd = (event: { nativeEvent: { type: string } }) => {
    setIsPlaying(false);
    console.log('MuxPlayerView: Video ended', event.nativeEvent);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (seekTime: number) => {
    setCurrentTime(seekTime);
    if (onSeek) {
      onSeek(seekTime);
    }
  };

  const seekBackward = () => {
    const newTime = Math.max(0, currentTime - 10);
    handleSeek(newTime);
  };

  const seekForward = () => {
    const newTime = Math.min(duration, currentTime + 10);
    handleSeek(newTime);
  };

  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    if (onFullscreenChange) {
      onFullscreenChange(newFullscreenState);
    }
  };

  const handlePlaybackSpeedChange = (speed: number) => {
    setCurrentPlaybackSpeed(speed);
    setShowSpeedModal(false);
    if (onPlaybackSpeedChange) {
      onPlaybackSpeedChange(speed);
    }
  };

  const handleSubtitleChange = (subtitle: SubtitleTrack | null) => {
    setSelectedSubtitle(subtitle);
    setShowSubtitleModal(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const renderControls = () => {
    if (!showControlsProps) return null;

    return (
      <Animated.View 
        style={[styles.controlsOverlay, { opacity: fadeAnim }]}
        pointerEvents={showControlsOverlay ? 'auto' : 'none'}
      >
        {/* Top controls */}
        <View style={styles.topControls}>
          <Text style={styles.videoTitle} numberOfLines={1}>{title}</Text>
          {enableChromecast && (
            <TouchableOpacity style={styles.controlButton}>
              <Text style={styles.controlButtonText}>Cast</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Center controls */}
        <View style={styles.centerControls}>
          {enableSeek && (
            <TouchableOpacity style={styles.seekButton} onPress={seekBackward}>
              <Text style={styles.seekButtonText}>-10</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.playPauseButton} onPress={togglePlayPause}>
            <Text style={styles.playPauseButtonText}>
              {isPlaying ? '⏸️' : '▶️'}
            </Text>
          </TouchableOpacity>
          
          {enableSeek && (
            <TouchableOpacity style={styles.seekButton} onPress={seekForward}>
              <Text style={styles.seekButtonText}>+10</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFilled, 
                  { width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }
                ]} 
              />
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
          
          <View style={styles.rightControls}>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={() => setShowSpeedModal(true)}
            >
              <Text style={styles.controlButtonText}>{currentPlaybackSpeed}x</Text>
            </TouchableOpacity>
            
            {enableSubtitles && subtitleTracks.length > 0 && (
              <TouchableOpacity 
                style={styles.controlButton} 
                onPress={() => setShowSubtitleModal(true)}
              >
                <Text style={styles.controlButtonText}>CC</Text>
              </TouchableOpacity>
            )}
            
            {enableFullscreen && (
              <TouchableOpacity style={styles.controlButton} onPress={toggleFullscreen}>
                <Text style={styles.controlButtonText}>
                  {isFullscreen ? '⤏' : '⤢'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderSpeedModal = () => (
    <Modal
      visible={showSpeedModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSpeedModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        onPress={() => setShowSpeedModal(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Playback Speed</Text>
          <FlatList
            data={PLAYBACK_SPEED_OPTIONS}
            keyExtractor={(item) => item.value.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  item.value === currentPlaybackSpeed && styles.modalOptionSelected
                ]}
                onPress={() => handlePlaybackSpeedChange(item.value)}
              >
                <Text style={[
                  styles.modalOptionText,
                  item.value === currentPlaybackSpeed && styles.modalOptionTextSelected
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderSubtitleModal = () => (
    <Modal
      visible={showSubtitleModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSubtitleModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        onPress={() => setShowSubtitleModal(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Subtitles</Text>
          <TouchableOpacity
            style={[
              styles.modalOption,
              !selectedSubtitle && styles.modalOptionSelected
            ]}
            onPress={() => handleSubtitleChange(null)}
          >
            <Text style={[
              styles.modalOptionText,
              !selectedSubtitle && styles.modalOptionTextSelected
            ]}>
              Off
            </Text>
          </TouchableOpacity>
          <FlatList
            data={subtitleTracks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  selectedSubtitle?.id === item.id && styles.modalOptionSelected
                ]}
                onPress={() => handleSubtitleChange(item)}
              >
                <Text style={[
                  styles.modalOptionText,
                  selectedSubtitle?.id === item.id && styles.modalOptionTextSelected
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={[styles.container, { height: videoHeight }]}>
      <TouchableOpacity 
        style={[styles.player, { height: videoHeight }]}
        activeOpacity={1}
        onPress={toggleControls}
      >
        <NativeMuxPlayerView
          style={[styles.player, { height: videoHeight }]}
          playbackId={playbackId}
          title={title}
          videoId={videoId || playbackId}
          autoPlay={autoPlay}
          muted={muted}
          showControls={false}
          enableFullscreen={enableFullscreen}
          enableSeek={enableSeek}
          enableSubtitles={enableSubtitles}
          playbackSpeed={currentPlaybackSpeed}
          enableChromecast={enableChromecast}
          onLoad={handleLoad}
          onError={handleError}
          onProgress={handleProgress}
          onEnd={handleEnd}
          onFullscreenChange={(event) => {
            setIsFullscreen(event.nativeEvent.isFullscreen);
            onFullscreenChange?.(event.nativeEvent.isFullscreen);
          }}
          onSeek={(event) => {
            setCurrentTime(event.nativeEvent.seekTime);
            onSeek?.(event.nativeEvent.seekTime);
          }}
          onPlaybackSpeedChange={(event) => {
            setCurrentPlaybackSpeed(event.nativeEvent.playbackSpeed);
            onPlaybackSpeedChange?.(event.nativeEvent.playbackSpeed);
          }}
        />
      </TouchableOpacity>
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4DA6FF" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}

      {renderControls()}
      {renderSpeedModal()}
      {renderSubtitleModal()}
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
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'space-between',
    padding: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  playPauseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  playPauseButtonText: {
    fontSize: 30,
    color: '#FFF',
  },
  seekButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seekButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
  },
  bottomControls: {
    flexDirection: 'column',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeText: {
    color: '#FFF',
    fontSize: 14,
    minWidth: 40,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginHorizontal: 10,
  },
  progressFilled: {
    height: '100%',
    backgroundColor: '#4DA6FF',
    borderRadius: 2,
  },
  rightControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
    minWidth: 40,
  },
  controlButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 20,
    minWidth: 200,
    maxHeight: '60%',
  },
  modalTitle: {
    color: '#4DA6FF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 5,
  },
  modalOptionSelected: {
    backgroundColor: '#4DA6FF',
  },
  modalOptionText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
  },
  modalOptionTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default MuxPlayerView;