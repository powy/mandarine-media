import { ViewProps } from 'react-native';

export interface MuxPlayerViewProps extends ViewProps {
  playbackId: string;
  title?: string;
  videoId?: string;
  autoPlay?: boolean;
  muted?: boolean;
  showControls?: boolean;
  enableFullscreen?: boolean;
  enableSeek?: boolean;
  enableSubtitles?: boolean;
  playbackSpeed?: number;
  enableChromecast?: boolean;
  onLoad?: (event: { nativeEvent: { type: string } }) => void;
  onError?: (event: { nativeEvent: { error: string } }) => void;
  onProgress?: (event: { nativeEvent: { currentTime: number; duration: number } }) => void;
  onEnd?: (event: { nativeEvent: { type: string } }) => void;
  onFullscreenChange?: (event: { nativeEvent: { isFullscreen: boolean } }) => void;
  onSeek?: (event: { nativeEvent: { seekTime: number } }) => void;
  onPlaybackSpeedChange?: (event: { nativeEvent: { playbackSpeed: number } }) => void;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  url?: string;
}

export interface PlaybackSpeedOption {
  value: number;
  label: string;
}

declare const MuxPlayerView: React.ComponentType<MuxPlayerViewProps>;