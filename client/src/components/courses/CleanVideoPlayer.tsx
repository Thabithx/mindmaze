import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  ShieldAlert,
  Loader2,
  Settings,
} from 'lucide-react';
import { extractYouTubeId } from './learning';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface CleanVideoPlayerProps {
  url: string;
  title?: string;
  studentName?: string;
  indexNumber?: string;
  onEnded?: () => void;
}

export const CleanVideoPlayer: React.FC<CleanVideoPlayerProps> = ({
  url,
  title,
  studentName = 'Student',
  indexNumber = 'MM-STUDENT',
  onEnded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const playerId = useRef(`clean-yt-player-${Math.random().toString(36).substring(2, 9)}`);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [watermarkPos, setWatermarkPos] = useState({ top: '8%', right: '5%' });

  const controlsTimeoutRef = useRef<any>(null);
  const timeUpdateIntervalRef = useRef<any>(null);

  const youtubeId = extractYouTubeId(url);

  // Periodically move watermark to deter screen recording & cropping
  useEffect(() => {
    const positions = [
      { top: '10%', right: '6%' },
      { top: '12%', left: '6%' },
      { bottom: '18%', right: '6%' },
      { bottom: '18%', left: '6%' },
      { top: '45%', right: '10%' },
    ];
    let posIndex = 0;
    const interval = setInterval(() => {
      posIndex = (posIndex + 1) % positions.length;
      setWatermarkPos(positions[posIndex] as any);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const hrs = Math.floor(m / 60);
    const min = m % 60;
    if (hrs > 0) {
      return `${hrs}:${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
    }
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Activity timer for hiding controls
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3500);
    }
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (!youtubeId) return;

    let destroyed = false;

    const initPlayer = () => {
      if (destroyed || !window.YT || !window.YT.Player) return;
      
      const elem = document.getElementById(playerId.current);
      if (!elem) return;

      // Clean existing player instance
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {}
      }

      playerRef.current = new window.YT.Player(playerId.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 0, // Disable YouTube default controls completely
          disablekb: 1, // Disable keyboard shortcuts to prevent link opening
          fs: 0, // Disable native YouTube fullscreen button
          modestbranding: 1, // Remove YouTube branding
          rel: 0, // Disable related external videos
          showinfo: 0, // Hide title bar
          iv_load_policy: 3, // Hide interactive annotations
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            if (destroyed) return;
            setIsReady(true);
            setDuration(event.target.getDuration() || 0);
          },
          onStateChange: (event: any) => {
            if (destroyed) return;
            // 1: PLAYING, 2: PAUSED, 3: BUFFERING, 0: ENDED
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setIsBuffering(false);
              setDuration(event.target.getDuration() || 0);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              setIsBuffering(false);
              setShowControls(true);
            } else if (event.data === window.YT.PlayerState.BUFFERING) {
              setIsBuffering(true);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              setIsBuffering(false);
              setShowControls(true);
              // Reset video to start so YouTube end-screen recommendations never appear
              try {
                event.target.seekTo(0, true);
                event.target.pauseVideo();
              } catch {}
              if (onEnded) onEnded();
            }
          },
        },
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousCallback) previousCallback();
        initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      destroyed = true;
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {}
      }
    };
  }, [youtubeId]);

  // Sync playback progress
  useEffect(() => {
    if (isPlaying) {
      timeUpdateIntervalRef.current = setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          const t = playerRef.current.getCurrentTime();
          setCurrentTime(t);
        }
      }, 300);
    } else {
      if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    }
    return () => {
      if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    };
  }, [isPlaying]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Controls actions
  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(targetTime, true);
    }
  };

  const skipSeconds = (delta: number) => {
    if (!playerRef.current?.getCurrentTime) return;
    const current = playerRef.current.getCurrentTime();
    const target = Math.max(0, Math.min(duration, current + delta));
    playerRef.current.seekTo(target, true);
    setCurrentTime(target);
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 100);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value);
    setVolume(newVol);
    if (playerRef.current) {
      if (newVol === 0) {
        playerRef.current.mute();
        setIsMuted(true);
      } else {
        if (isMuted) {
          playerRef.current.unMute();
          setIsMuted(false);
        }
        playerRef.current.setVolume(newVol);
      }
    }
  };

  const setSpeed = (rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    if (playerRef.current?.setPlaybackRate) {
      playerRef.current.setPlaybackRate(rate);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
      } catch (err) {
        console.error('Fullscreen request failed:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Exit fullscreen failed:', err);
      }
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onMouseEnter={() => setShowControls(true)}
      onContextMenu={(e) => e.preventDefault()}
      className="clean-video-player relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl select-none group"
    >
      {/* 
        IFRAME CONTAINER WITH CROP MASK
        Scaling and vertical offset physically cuts off the top 60px (channel name, avatar, share/copy link)
        and the bottom 50px (YouTube logo & suggestions) from viewport!
      */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-black pointer-events-none">
        <div className="relative w-full h-[calc(100%+140px)] -top-[70px] scale-[1.18] flex items-center justify-center">
          <div id={playerId.current} className="w-full h-full" />
        </div>
      </div>

      {/* 
        TRANSPARENT SHIELD & CLICK CAPTURE
        Intercepts ALL mouse events so students can NEVER click any YouTube elements
      */}
      <div
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center bg-transparent"
      >
        {/* Big Center Play/Pause Indicator (on pause) */}
        {!isPlaying && isReady && (
          <div
            style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/50 hover:scale-110 transition-transform backdrop-blur-md border border-white/20"
          >
            <Play className="w-9 h-9 ml-1" style={{ fill: '#ffffff', color: '#ffffff' }} />
          </div>
        )}

        {/* Buffering Indicator */}
        {isBuffering && (
          <div
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', color: '#ffffff' }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl backdrop-blur-md border border-white/10"
          >
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#22d3ee' }} />
            <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#67e8f9' }}>
              Loading lesson...
            </span>
          </div>
        )}
      </div>

      {/* 
        DYNAMIC ANTI-PIRACY SECURITY WATERMARK OVERLAY
        Floats dynamically across the screen with student name and verified index number
      */}
      <div
        style={{
          ...watermarkPos,
          backgroundColor: 'rgba(2, 6, 23, 0.88)',
          borderColor: 'rgba(255, 255, 255, 0.22)',
          color: '#ffffff',
        }}
        className="video-watermark pointer-events-none absolute z-20 px-3.5 py-1.5 rounded-xl backdrop-blur-md border text-[11px] font-mono font-bold tracking-wider transition-all duration-1000 shadow-xl"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
        <span style={{ color: '#ffffff' }}>{studentName} • {indexNumber}</span>
      </div>

      {/* TOP HEADER OVERLAY (High Contrast Glass Pill) */}
      <div
        className={`absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          style={{ backgroundColor: 'rgba(2, 6, 23, 0.88)', borderColor: 'rgba(255, 255, 255, 0.18)' }}
          className="video-header-pill flex items-center gap-2 backdrop-blur-md px-3.5 py-2 rounded-xl border shadow-xl max-w-[70%]"
        >
          <span
            className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-600 shrink-0"
            style={{ color: '#ffffff' }}
          >
            MIND MAZE PLAYER
          </span>
          {title && (
            <span className="text-xs font-bold truncate" style={{ color: '#ffffff' }}>
              {title}
            </span>
          )}
        </div>

        <div
          style={{ backgroundColor: 'rgba(2, 6, 23, 0.88)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
          className="flex items-center gap-1.5 backdrop-blur-md px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-xl"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span style={{ color: '#34d399' }}>Protected Stream</span>
        </div>
      </div>

      {/* 
        CUSTOM HIGH-CONTRAST FROSTED BOTTOM CONTROL BAR
        Crystal clear icons, bright white labels, frosted dark background
      */}
      <div
        style={{
          backgroundColor: 'rgba(2, 6, 23, 0.94)',
          borderColor: 'rgba(255, 255, 255, 0.18)',
          color: '#ffffff',
        }}
        className={`video-control-bar absolute bottom-3 left-3 right-3 z-30 p-3 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 ${
          showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seekbar Timeline */}
        <div className="relative mb-2.5 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-cyan-400 focus:outline-none hover:h-2.5 transition-all"
            style={{
              background: `linear-gradient(to right, #22d3ee ${progressPercent}%, rgba(255, 255, 255, 0.25) ${progressPercent}%)`,
              accentColor: '#22d3ee',
            }}
          />
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-white flex-wrap gap-2" style={{ color: '#ffffff' }}>
          {/* Left Controls: Play/Pause, Rewind, Forward, Volume, Time */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}
              className="p-2.5 rounded-xl hover:bg-indigo-500 transition cursor-pointer shadow-md shadow-indigo-600/30 flex items-center justify-center shrink-0 border border-indigo-400/30"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" style={{ fill: '#ffffff', color: '#ffffff' }} />
              ) : (
                <Play className="w-4 h-4 ml-0.5" style={{ fill: '#ffffff', color: '#ffffff' }} />
              )}
            </button>

            {/* Skip Rewind 10s */}
            <button
              onClick={() => skipSeconds(-10)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                borderColor: 'rgba(255, 255, 255, 0.24)',
                color: '#ffffff',
              }}
              className="video-action-btn px-2.5 py-1.5 rounded-xl hover:bg-white/25 border transition cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0 shadow-sm"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>-10s</span>
            </button>

            {/* Skip Forward 10s */}
            <button
              onClick={() => skipSeconds(10)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                borderColor: 'rgba(255, 255, 255, 0.24)',
                color: '#ffffff',
              }}
              className="video-action-btn px-2.5 py-1.5 rounded-xl hover:bg-white/25 border transition cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0 shadow-sm"
              title="Forward 10 seconds"
            >
              <RotateCw className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>+10s</span>
            </button>

            {/* Volume Control */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                borderColor: 'rgba(255, 255, 255, 0.24)',
                color: '#ffffff',
              }}
              className="video-action-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0 shadow-sm"
            >
              <button
                onClick={toggleMute}
                style={{ color: '#ffffff' }}
                className="hover:text-cyan-300 transition cursor-pointer flex items-center justify-center"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" style={{ color: '#fb7185' }} />
                ) : volume < 50 ? (
                  <Volume1 className="w-4 h-4" style={{ color: '#ffffff' }} />
                ) : (
                  <Volume2 className="w-4 h-4" style={{ color: '#ffffff' }} />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                style={{ accentColor: '#22d3ee', backgroundColor: 'rgba(255, 255, 255, 0.35)' }}
              />
            </div>

            {/* Time Indicator Badge */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                borderColor: 'rgba(255, 255, 255, 0.24)',
                color: '#ffffff',
              }}
              className="video-time-badge px-3 py-1.5 rounded-xl border font-mono text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <span style={{ color: '#38bdf8' }}>{formatTime(currentTime)}</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>/</span>
              <span style={{ color: '#ffffff' }}>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Playback Speed, Fullscreen */}
          <div className="flex items-center gap-2 relative shrink-0">
            {/* Playback Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.16)',
                  borderColor: 'rgba(255, 255, 255, 0.24)',
                  color: '#ffffff',
                }}
                className="video-action-btn flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-white/25 border text-xs font-bold transition cursor-pointer shadow-sm"
                title="Playback speed"
              >
                <Settings className="w-3.5 h-3.5" style={{ color: '#38bdf8' }} />
                <span style={{ color: '#ffffff' }}>{playbackRate}x</span>
              </button>

              {/* Speed Menu Dropdown */}
              {showSpeedMenu && (
                <div
                  style={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                  className="video-speed-menu absolute bottom-full right-0 mb-2 py-1.5 rounded-xl border shadow-2xl backdrop-blur-xl flex flex-col min-w-[105px] z-50"
                >
                  <span style={{ color: '#94a3b8' }} className="px-3 py-1 text-[10px] font-bold uppercase border-b border-white/10">
                    Speed
                  </span>
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setSpeed(rate)}
                      style={{
                        color: playbackRate === rate ? '#38bdf8' : '#e2e8f0',
                        backgroundColor: playbackRate === rate ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      }}
                      className="px-3 py-1.5 text-left text-xs font-bold hover:bg-white/15 transition cursor-pointer flex items-center justify-between"
                    >
                      <span>{rate === 1 ? 'Normal' : `${rate}x`}</span>
                      {playbackRate === rate && <span style={{ color: '#38bdf8' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                borderColor: 'rgba(255, 255, 255, 0.24)',
                color: '#ffffff',
              }}
              className="video-action-btn p-2 rounded-xl hover:bg-white/25 border transition cursor-pointer flex items-center justify-center shadow-sm"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" style={{ color: '#ffffff' }} />
              ) : (
                <Maximize className="w-4 h-4" style={{ color: '#ffffff' }} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

