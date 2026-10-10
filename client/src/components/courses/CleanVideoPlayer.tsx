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
      className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl select-none group"
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
          <div className="w-20 h-20 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/50 hover:scale-110 transition-transform backdrop-blur-md border border-white/20">
            <Play className="w-9 h-9 ml-1 fill-white" />
          </div>
        )}

        {/* Buffering Indicator */}
        {isBuffering && (
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 text-white">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-cyan-300">Loading lesson...</span>
          </div>
        )}
      </div>

      {/* 
        DYNAMIC ANTI-PIRACY SECURITY WATERMARK OVERLAY
        Floats dynamically across the screen with student name and verified index number
      */}
      <div
        style={{ ...watermarkPos }}
        className="pointer-events-none absolute z-20 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono font-medium text-white/50 tracking-wider transition-all duration-1000 shadow-lg"
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
        {studentName} • {indexNumber}
      </div>

      {/* TOP HEADER OVERLAY (Clean Title) */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-cyan-300 border border-indigo-400/30">
              Mind Maze Player
            </span>
            {title && <h3 className="text-sm font-bold text-white drop-shadow truncate max-w-md">{title}</h3>}
          </div>
          <span className="text-[11px] font-semibold text-slate-400 bg-black/50 px-2.5 py-1 rounded-full border border-white/10">
            Encrypted Stream
          </span>
        </div>
      </div>

      {/* 
        CUSTOM PROFESSIONAL BOTTOM CONTROL BAR
        Zero YouTube branding, custom timeline, speed, volume, and fullscreen controls
      */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 px-4 py-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent transition-all duration-300 ${
          showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Timeline Slider */}
        <div className="relative mb-2 flex items-center group/timeline">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none hover:h-2 transition-all"
            style={{
              background: `linear-gradient(to right, #22d3ee ${progressPercent}%, rgba(51, 65, 85, 0.8) ${progressPercent}%)`,
            }}
          />
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls: Play/Pause, Skip, Time, Volume */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            <button
              onClick={() => skipSeconds(-10)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => skipSeconds(10)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="Forward 10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/volume ml-1">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 50 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              />
            </div>

            {/* Time Indicator */}
            <div className="text-slate-300 font-mono text-[11px] ml-2 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-slate-400">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Playback Speed, Fullscreen */}
          <div className="flex items-center gap-2 relative">
            {/* Playback Speed Button */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition cursor-pointer"
                title="Playback speed"
              >
                <span>{playbackRate}x</span>
              </button>

              {/* Speed Menu Dropdown */}
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 py-1.5 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md flex flex-col min-w-[80px] z-50">
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setSpeed(rate)}
                      className={`px-3 py-1.5 text-left text-xs font-semibold hover:bg-white/10 transition cursor-pointer ${
                        playbackRate === rate ? 'text-cyan-400 bg-white/5' : 'text-slate-300'
                      }`}
                    >
                      {rate === 1 ? 'Normal (1x)' : `${rate}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
