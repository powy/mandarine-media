import UIKit
import AVFoundation
import AVKit
import MuxPlayerSwift

@objc(MuxPlayerView)
class MuxPlayerView: UIView {
    
    @objc var playbackId: String? {
        didSet {
            loadVideo()
        }
    }
    
    @objc var title: String = "Video" {
        didSet {
            // Update title when changed
        }
    }
    
    @objc var videoId: String?
    
    @objc var autoPlay: Bool = false
    
    @objc var muted: Bool = false {
        didSet {
            playerViewController?.player?.isMuted = muted
        }
    }
    
    @objc var onLoad: RCTBubblingEventBlock?
    @objc var onError: RCTBubblingEventBlock?
    @objc var onProgress: RCTBubblingEventBlock?
    @objc var onEnd: RCTBubblingEventBlock?
    @objc var onFullscreenChange: RCTBubblingEventBlock?
    @objc var onSeek: RCTBubblingEventBlock?
    @objc var onPlaybackSpeedChange: RCTBubblingEventBlock?
    
    // Mux built-in controls configuration
    @objc var showControls: Bool = true {
        didSet {
            playerViewController?.showsPlaybackControls = showControls
        }
    }
    
    @objc var enableFullscreen: Bool = true
    @objc var enableSeek: Bool = true
    @objc var enableSubtitles: Bool = true
    @objc var playbackSpeed: Float = 1.0 {
        didSet {
            playerViewController?.player?.rate = playbackSpeed
        }
    }
    @objc var enableChromecast: Bool = true
    @objc var maximumResolution: String = "default"
    
    private var playerViewController: AVPlayerViewController?
    private var timeObserver: Any?
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupPlayer()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupPlayer()
    }
    
    private func setupPlayer() {
        backgroundColor = .black
    }
    
    private func loadVideo() {
        guard let playbackId = playbackId, !playbackId.isEmpty else {
            return
        }
        
        // Remove existing player if any
        playerViewController?.view.removeFromSuperview()
        playerViewController?.removeFromParent()
        
        // Create PlaybackOptions for configuration
        var resolutionTier: PlaybackOptions.ResolutionTier = .default
        switch maximumResolution.lowercased() {
        case "720p": resolutionTier = .upTo720p
        case "1080p": resolutionTier = .upTo1080p
        case "1440p": resolutionTier = .upTo1440p
        case "2160p": resolutionTier = .upTo2160p
        default: resolutionTier = .default
        }
        
        let playbackOptions = PlaybackOptions(
            maximumResolution: resolutionTier
        )
        
        // Create MonitoringOptions for Mux Data
        let customerData = MUXSDKCustomerData()
        customerData.videoData = MUXSDKCustomerVideoData()
        customerData.videoData?.videoTitle = title
        customerData.videoData?.videoId = videoId ?? playbackId
        
        customerData.playerData = MUXSDKCustomerPlayerData()
        customerData.playerData?.playerName = "Mux Player iOS"
        customerData.playerData?.playerVersion = "1.0.0"
        
        let monitoringOptions = MonitoringOptions(
            customerData: customerData
        )
        
        // Create AVPlayerViewController with Mux Player
        let newPlayerViewController = AVPlayerViewController(
            playbackID: playbackId,
            playbackOptions: playbackOptions,
            monitoringOptions: monitoringOptions
        )
        
        self.playerViewController = newPlayerViewController
        
        // Add as child view
        if let parentViewController = self.parentViewController {
            parentViewController.addChild(newPlayerViewController)
            addSubview(newPlayerViewController.view)
            newPlayerViewController.view.frame = bounds
            newPlayerViewController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            newPlayerViewController.didMove(toParent: parentViewController)
        }
        
        // Configure built-in controls and player
        newPlayerViewController.showsPlaybackControls = showControls
        
        if let player = newPlayerViewController.player {
            player.isMuted = muted
            player.rate = playbackSpeed
            
            // Add observers for built-in controls
            addPlayerObservers(to: player)
            addFullscreenObserver(to: newPlayerViewController)
            
            // Auto play if requested
            if autoPlay {
                player.play()
            }
            
            // Send load event
            onLoad?(["type": "ready"])
        }
    }
    
    private func addPlayerObservers(to player: AVPlayer) {
        // Time observer for progress and seek detection
        let interval = CMTime(seconds: 0.5, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        timeObserver = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            if let duration = player.currentItem?.duration {
                let currentTime = CMTimeGetSeconds(time)
                let totalDuration = CMTimeGetSeconds(duration)
                
                self?.onProgress?([
                    "currentTime": currentTime,
                    "duration": totalDuration
                ])
            }
        }
        
        // Rate observer for playback speed changes
        player.addObserver(self, forKeyPath: "rate", options: [.new, .old], context: nil)
        
        // Status observer
        player.addObserver(self, forKeyPath: "status", options: [.new], context: nil)
        
        // Item status observer
        if let currentItem = player.currentItem {
            currentItem.addObserver(self, forKeyPath: "status", options: [.new], context: nil)
        }
        
        // End notification
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(playerDidFinishPlaying),
            name: .AVPlayerItemDidPlayToEndTime,
            object: player.currentItem
        )
    }
    
    private func addFullscreenObserver(to playerViewController: AVPlayerViewController) {
        // Note: iOS AVPlayerViewController handles fullscreen automatically
        // This is for notification purposes when built-in fullscreen is used
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(playerWillEnterFullScreen),
            name: UIWindow.didBecomeKeyNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(playerWillExitFullScreen),
            name: UIWindow.didResignKeyNotification,
            object: nil
        )
    }
    
    @objc private func playerWillEnterFullScreen() {
        onFullscreenChange?(["isFullscreen": true])
    }
    
    @objc private func playerWillExitFullScreen() {
        onFullscreenChange?(["isFullscreen": false])
    }
    
    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "status" {
            if let player = object as? AVPlayer {
                switch player.status {
                case .readyToPlay:
                    onLoad?(["type": "ready"])
                case .failed:
                    let errorMsg = player.error?.localizedDescription ?? "Unknown playback error"
                    onError?(["error": errorMsg])
                default:
                    break
                }
            } else if let playerItem = object as? AVPlayerItem {
                switch playerItem.status {
                case .failed:
                    let errorMsg = playerItem.error?.localizedDescription ?? "Unknown item error"
                    onError?(["error": errorMsg])
                default:
                    break
                }
            }
        } else if keyPath == "rate" {
            if let player = object as? AVPlayer {
                let newRate = player.rate
                if newRate != playbackSpeed {
                    playbackSpeed = newRate
                    onPlaybackSpeedChange?(["playbackSpeed": Double(newRate)])
                }
            }
        }
    }
    
    @objc private func playerDidFinishPlaying() {
        onEnd?(["type": "ended"])
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        playerViewController?.view.frame = bounds
    }
    
    deinit {
        // Remove observers
        if let timeObserver = timeObserver {
            playerViewController?.player?.removeTimeObserver(timeObserver)
        }
        
        playerViewController?.player?.removeObserver(self, forKeyPath: "status")
        playerViewController?.player?.currentItem?.removeObserver(self, forKeyPath: "status")
        
        NotificationCenter.default.removeObserver(self)
    }
}

// Extension to find parent view controller
extension UIView {
    var parentViewController: UIViewController? {
        var parentResponder: UIResponder? = self
        while parentResponder != nil {
            parentResponder = parentResponder?.next
            if let viewController = parentResponder as? UIViewController {
                return viewController
            }
        }
        return nil
    }
}