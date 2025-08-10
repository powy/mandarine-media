import Foundation
import React

@objc(MuxPlayerViewManager)
class MuxPlayerViewManager: RCTViewManager {
    
    override func view() -> UIView! {
        return MuxPlayerView()
    }
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    // Export properties
    @objc override func constantsToExport() -> [AnyHashable: Any]! {
        return [:]
    }
}

// Property exports - These need to be in Objective-C for React Native
extension MuxPlayerViewManager {
    
    @objc func setPlaybackId(_ view: MuxPlayerView, playbackId: String) {
        view.playbackId = playbackId
    }
    
    @objc func setTitle(_ view: MuxPlayerView, title: String) {
        view.title = title
    }
    
    @objc func setVideoId(_ view: MuxPlayerView, videoId: String) {
        view.videoId = videoId
    }
    
    @objc func setAutoPlay(_ view: MuxPlayerView, autoPlay: Bool) {
        view.autoPlay = autoPlay
    }
    
    @objc func setMuted(_ view: MuxPlayerView, muted: Bool) {
        view.muted = muted
    }
}