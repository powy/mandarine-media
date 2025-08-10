package com.alpha;

import android.widget.FrameLayout;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.ui.PlayerView;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.mux.player.MuxPlayer;
import com.mux.player.media.MediaItems;
import java.util.Map;

public class MuxPlayerViewManager extends SimpleViewManager<FrameLayout> {
    public static final String REACT_CLASS = "MuxPlayerView";
    
    private static final String EVENT_ON_LOAD = "onLoad";
    private static final String EVENT_ON_ERROR = "onError";
    private static final String EVENT_ON_PROGRESS = "onProgress";
    private static final String EVENT_ON_END = "onEnd";
    private static final String EVENT_ON_FULLSCREEN_CHANGE = "onFullscreenChange";
    private static final String EVENT_ON_SEEK = "onSeek";
    private static final String EVENT_ON_PLAYBACK_SPEED_CHANGE = "onPlaybackSpeedChange";

    @Override
    @NonNull
    public String getName() {
        return REACT_CLASS;
    }

    @Override
    @NonNull
    public FrameLayout createViewInstance(@NonNull ThemedReactContext reactContext) {
        return new MuxPlayerLayout(reactContext);
    }

    @ReactProp(name = "playbackId")
    public void setPlaybackId(FrameLayout view, String playbackId) {
        ((MuxPlayerLayout) view).setPlaybackId(playbackId);
    }

    @ReactProp(name = "autoPlay", defaultBoolean = false)
    public void setAutoPlay(FrameLayout view, boolean autoPlay) {
        ((MuxPlayerLayout) view).setAutoPlay(autoPlay);
    }

    @ReactProp(name = "muted", defaultBoolean = false)
    public void setMuted(FrameLayout view, boolean muted) {
        ((MuxPlayerLayout) view).setMuted(muted);
    }

    @ReactProp(name = "title")
    public void setTitle(FrameLayout view, String title) {
        ((MuxPlayerLayout) view).setTitle(title);
    }

    @ReactProp(name = "videoId")
    public void setVideoId(FrameLayout view, String videoId) {
        ((MuxPlayerLayout) view).setVideoId(videoId);
    }

    @ReactProp(name = "showControls", defaultBoolean = true)
    public void setShowControls(FrameLayout view, boolean showControls) {
        ((MuxPlayerLayout) view).setShowControls(showControls);
    }

    @ReactProp(name = "enableFullscreen", defaultBoolean = true)
    public void setEnableFullscreen(FrameLayout view, boolean enableFullscreen) {
        ((MuxPlayerLayout) view).setEnableFullscreen(enableFullscreen);
    }

    @ReactProp(name = "enableSeek", defaultBoolean = true)
    public void setEnableSeek(FrameLayout view, boolean enableSeek) {
        ((MuxPlayerLayout) view).setEnableSeek(enableSeek);
    }

    @ReactProp(name = "enableSubtitles", defaultBoolean = true)
    public void setEnableSubtitles(FrameLayout view, boolean enableSubtitles) {
        ((MuxPlayerLayout) view).setEnableSubtitles(enableSubtitles);
    }

    @ReactProp(name = "playbackSpeed", defaultFloat = 1.0f)
    public void setPlaybackSpeed(FrameLayout view, float playbackSpeed) {
        ((MuxPlayerLayout) view).setPlaybackSpeed(playbackSpeed);
    }

    @ReactProp(name = "enableChromecast", defaultBoolean = true)
    public void setEnableChromecast(FrameLayout view, boolean enableChromecast) {
        ((MuxPlayerLayout) view).setEnableChromecast(enableChromecast);
    }

    @ReactProp(name = "maximumResolution")
    public void setMaximumResolution(FrameLayout view, String maximumResolution) {
        ((MuxPlayerLayout) view).setMaximumResolution(maximumResolution);
    }

    @Override
    public Map<String, Object> getExportedCustomBubblingEventTypeConstants() {
        return MapBuilder.<String, Object>builder()
                .put(EVENT_ON_LOAD, MapBuilder.of("phasedRegistrationNames", MapBuilder.of("bubbled", EVENT_ON_LOAD)))
                .put(EVENT_ON_ERROR, MapBuilder.of("phasedRegistrationNames", MapBuilder.of("bubbled", EVENT_ON_ERROR)))
                .put(EVENT_ON_PROGRESS, MapBuilder.of("phasedRegistrationNames", MapBuilder.of("bubbled", EVENT_ON_PROGRESS)))
                .put(EVENT_ON_END, MapBuilder.of("phasedRegistrationNames", MapBuilder.of("bubbled", EVENT_ON_END)))
                .put(EVENT_ON_FULLSCREEN_CHANGE, MapBuilder.of("phasedRegistrationNames", MapBuilder.of("bubbled", EVENT_ON_FULLSCREEN_CHANGE)))
                .put(EVENT_ON_SEEK, MapBuilder.of("phasedRegistrationNames", MapBuilder.of("bubbled", EVENT_ON_SEEK)))
                .put(EVENT_ON_PLAYBACK_SPEED_CHANGE, MapBuilder.of("phasedRegistrationNames", MapBuilder.of("bubbled", EVENT_ON_PLAYBACK_SPEED_CHANGE)))
                .build();
    }

    private static class MuxPlayerLayout extends FrameLayout {
        private MuxPlayer muxPlayer;
        private PlayerView playerView;
        private ReactContext reactContext;
        private String playbackId;
        private String title = "Video";
        private String videoId;
        private boolean autoPlay = false;
        private boolean muted = false;
        private boolean showControls = true;
        private boolean enableFullscreen = true;
        private boolean enableSeek = true;
        private boolean enableSubtitles = true;
        private float playbackSpeed = 1.0f;
        private boolean enableChromecast = true;
        private String maximumResolution = "default";
        private Runnable progressRunnable;

        public MuxPlayerLayout(@NonNull ReactContext context) {
            super(context);
            this.reactContext = context;
            initializePlayer();
        }

        private void initializePlayer() {
            muxPlayer = new MuxPlayer.Builder(getContext())
                    .enableLogcat(true)
                    .build();
            
            // Create PlayerView for UI with built-in controls
            playerView = new PlayerView(getContext());
            playerView.setPlayer(muxPlayer);
            playerView.setUseController(showControls);
            playerView.setControllerShowTimeoutMs(3000);
            playerView.setControllerHideOnTouch(true);
            
            // Configure built-in controls
            updateControlsVisibility();
            
            // Add PlayerView to layout
            LayoutParams layoutParams = new LayoutParams(
                LayoutParams.MATCH_PARENT, 
                LayoutParams.MATCH_PARENT
            );
            addView(playerView, layoutParams);

            // Add comprehensive player listener for events
            muxPlayer.addListener(new Player.Listener() {
                @Override
                public void onPlaybackStateChanged(int playbackState) {
                    WritableMap event = Arguments.createMap();
                    switch (playbackState) {
                        case Player.STATE_READY:
                            event.putString("type", "ready");
                            sendEvent(EVENT_ON_LOAD, event);
                            startProgressReporting();
                            break;
                        case Player.STATE_ENDED:
                            event.putString("type", "ended");
                            sendEvent(EVENT_ON_END, event);
                            stopProgressReporting();
                            break;
                        case Player.STATE_IDLE:
                        case Player.STATE_BUFFERING:
                            stopProgressReporting();
                            break;
                    }
                }

                @Override
                public void onPlayerError(PlaybackException error) {
                    WritableMap event = Arguments.createMap();
                    event.putString("error", error.getMessage() != null ? error.getMessage() : "Playback error occurred");
                    sendEvent(EVENT_ON_ERROR, event);
                }

                @Override
                public void onPositionDiscontinuity(Player.PositionInfo oldPosition, Player.PositionInfo newPosition, int reason) {
                    // Detect seek operations
                    if (reason == Player.DISCONTINUITY_REASON_SEEK) {
                        WritableMap event = Arguments.createMap();
                        event.putDouble("seekTime", newPosition.positionMs / 1000.0);
                        sendEvent(EVENT_ON_SEEK, event);
                    }
                }

                @Override
                public void onPlaybackParametersChanged(PlaybackParameters playbackParameters) {
                    WritableMap event = Arguments.createMap();
                    event.putDouble("playbackSpeed", playbackParameters.speed);
                    sendEvent(EVENT_ON_PLAYBACK_SPEED_CHANGE, event);
                }
            });
        }

        private void sendEvent(String eventName, WritableMap params) {
            reactContext.getJSModule(RCTEventEmitter.class).receiveEvent(getId(), eventName, params);
        }

        private void startProgressReporting() {
            if (progressRunnable != null) {
                stopProgressReporting();
            }
            progressRunnable = new Runnable() {
                @Override
                public void run() {
                    if (muxPlayer != null) {
                        WritableMap event = Arguments.createMap();
                        event.putDouble("currentTime", muxPlayer.getCurrentPosition() / 1000.0);
                        event.putDouble("duration", muxPlayer.getDuration() / 1000.0);
                        sendEvent(EVENT_ON_PROGRESS, event);
                        
                        // Continue reporting every 500ms
                        postDelayed(this, 500);
                    }
                }
            };
            post(progressRunnable);
        }

        private void stopProgressReporting() {
            if (progressRunnable != null) {
                removeCallbacks(progressRunnable);
                progressRunnable = null;
            }
        }

        public void setPlaybackId(String playbackId) {
            this.playbackId = playbackId;
            if (playbackId != null && !playbackId.isEmpty()) {
                loadVideo();
            }
        }

        public void setAutoPlay(boolean autoPlay) {
            this.autoPlay = autoPlay;
        }

        public void setMuted(boolean muted) {
            this.muted = muted;
            if (muxPlayer != null) {
                muxPlayer.setVolume(muted ? 0f : 1f);
            }
        }

        public void setTitle(String title) {
            this.title = title != null ? title : "Video";
        }

        public void setVideoId(String videoId) {
            this.videoId = videoId;
        }

        public void setShowControls(boolean showControls) {
            this.showControls = showControls;
            if (playerView != null) {
                playerView.setUseController(showControls);
            }
        }

        public void setEnableFullscreen(boolean enableFullscreen) {
            this.enableFullscreen = enableFullscreen;
            updateControlsVisibility();
        }

        public void setEnableSeek(boolean enableSeek) {
            this.enableSeek = enableSeek;
            updateControlsVisibility();
        }

        public void setEnableSubtitles(boolean enableSubtitles) {
            this.enableSubtitles = enableSubtitles;
            updateControlsVisibility();
        }

        public void setPlaybackSpeed(float playbackSpeed) {
            this.playbackSpeed = playbackSpeed;
            if (muxPlayer != null) {
                // MuxPlayer extends ExoPlayer, so we use the standard playback parameters
                muxPlayer.setPlaybackSpeed(playbackSpeed);
            }
        }

        public void setEnableChromecast(boolean enableChromecast) {
            this.enableChromecast = enableChromecast;
            // Chromecast support would be implemented here
        }

        public void setMaximumResolution(String maximumResolution) {
            this.maximumResolution = maximumResolution;
            if (playbackId != null) {
                loadVideo(); // Reload with new resolution
            }
        }

        private void updateControlsVisibility() {
            if (playerView == null) return;
            
            // Media3 PlayerView handles most controls automatically
            // Additional control customization can be done here
            playerView.setShowNextButton(false);
            playerView.setShowPreviousButton(false);
            
            // Note: Media3 PlayerView doesn't have setShowFullscreenButton method
            // Fullscreen is managed through setFullscreenButtonState and listeners
            if (enableFullscreen) {
                playerView.setFullscreenButtonClickListener(new PlayerView.FullscreenButtonClickListener() {
                    @Override
                    public void onFullscreenButtonClick(boolean isFullScreen) {
                        WritableMap event = Arguments.createMap();
                        event.putBoolean("isFullscreen", isFullScreen);
                        sendEvent(EVENT_ON_FULLSCREEN_CHANGE, event);
                    }
                });
            }
        }

        private void loadVideo() {
            if (playbackId == null) return;
            
            // Create MediaItem using Mux's MediaItems builder
            MediaItem mediaItem = MediaItems.builderFromMuxPlaybackId(playbackId)
                    .setMediaMetadata(
                            new MediaMetadata.Builder()
                                    .setTitle(title)
                                    .build()
                    )
                    .build();

            if (muxPlayer != null) {
                muxPlayer.setMediaItem(mediaItem);
                muxPlayer.prepare();
                muxPlayer.setPlayWhenReady(autoPlay);
                muxPlayer.setVolume(muted ? 0f : 1f);
            }
        }

        @Override
        protected void onDetachedFromWindow() {
            super.onDetachedFromWindow();
            stopProgressReporting();
            if (muxPlayer != null) {
                muxPlayer.release();
            }
        }
    }
}