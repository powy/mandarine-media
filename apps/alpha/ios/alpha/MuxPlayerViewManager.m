#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MuxPlayerViewManager, RCTViewManager)

// Export properties
RCT_EXPORT_VIEW_PROPERTY(playbackId, NSString)
RCT_EXPORT_VIEW_PROPERTY(title, NSString)
RCT_EXPORT_VIEW_PROPERTY(videoId, NSString)
RCT_EXPORT_VIEW_PROPERTY(autoPlay, BOOL)
RCT_EXPORT_VIEW_PROPERTY(muted, BOOL)

// Export events
RCT_EXPORT_VIEW_PROPERTY(onLoad, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onError, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onProgress, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onEnd, RCTBubblingEventBlock)

@end