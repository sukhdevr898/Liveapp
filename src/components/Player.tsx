import React, { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { RoomState } from "../types";
import { Play, Pause, Volume2, VolumeX, Maximize, Film, MessageSquare, Rewind, FastForward } from "lucide-react";
import { formatTime, cn } from "../utils";
import ReactPlayer from "react-player";

interface PlayerProps {
  socket: Socket;
  roomState: RoomState;
  onChangeVideo?: () => void;
  onToggleChat?: () => void;
  hasUnreadChat?: boolean;
  children?: React.ReactNode;
}

export default function Player({ socket, roomState, onChangeVideo, onToggleChat, hasUnreadChat, children }: PlayerProps) {
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(roomState.isPlaying);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(roomState.time);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Determine video URL
  const videoUrl = roomState.video
    ? (roomState.video.startsWith("http") ? roomState.video : `/videos/${roomState.video}`)
    : "";

  // Reset ready state on url change
  useEffect(() => {
    setIsReady(false);
  }, [videoUrl]);

  // Sync with server state
  useEffect(() => {
    if (!playerRef.current || !isReady) return;
    const player = playerRef.current;

    // Handle remote play
    const onPlay = (time: number) => {
      if (player && typeof player.currentTime !== 'undefined') {
        if (Math.abs(player.currentTime - time) > 1) {
          player.currentTime = time;
        }
      }
      setIsPlaying(true);
    };

    // Handle remote pause
    const onPause = (time: number) => {
      if (player && typeof player.currentTime !== 'undefined') {
        if (Math.abs(player.currentTime - time) > 0.5) {
          player.currentTime = time;
        }
      }
      setIsPlaying(false);
    };

    // Handle remote seek
    const onSeek = (time: number) => {
      if (player) {
        player.currentTime = time;
      }
    };

    socket.on("play", onPlay);
    socket.on("pause", onPause);
    socket.on("seek", onSeek);

    return () => {
      socket.off("play", onPlay);
      socket.off("pause", onPause);
      socket.off("seek", onSeek);
    };
  }, [socket, isReady]);

  // Handle source changes from server
  useEffect(() => {
    if (isReady && playerRef.current && typeof playerRef.current.currentTime !== 'undefined') {
      if (Math.abs(playerRef.current.currentTime - roomState.time) > 1) {
        playerRef.current.currentTime = roomState.time;
      }
      setIsPlaying(roomState.isPlaying);
    }
  }, [roomState.video, roomState.time, roomState.isPlaying, isReady]);

  const handlePlayPause = () => {
    if (!playerRef.current || typeof playerRef.current.currentTime === 'undefined') return;
    const t = playerRef.current.currentTime;
    if (!isPlaying) {
      socket.emit("play", t);
      setIsPlaying(true);
    } else {
      socket.emit("pause", t);
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playerRef.current || typeof playerRef.current.currentTime === 'undefined') return;
    const t = parseFloat(e.target.value);
    playerRef.current.currentTime = t;
    setCurrentTime(t);
    socket.emit("seek", t);
  };

  const handleSkip = (seconds: number) => {
    if (!playerRef.current || typeof playerRef.current.currentTime === 'undefined') return;
    const t = playerRef.current.currentTime;
    const newTime = Math.max(0, Math.min(t + seconds, duration));
    playerRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    socket.emit("seek", newTime);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      }
    }
  };

  const triggerControls = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  const PlayerComponent = (ReactPlayer as any).default || ReactPlayer;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black flex items-center justify-center group overflow-hidden"
      onMouseMove={triggerControls}
      onClick={triggerControls}
      onDoubleClick={toggleFullscreen}
      onMouseLeave={() => setShowControls(false)}
    >
      <PlayerComponent
        ref={playerRef}
        src={videoUrl}
        playing={isPlaying}
        volume={volume}
        width="100%"
        height="100%"
        controls={false}
        playsInline
        onReady={() => setIsReady(true)}
        onTimeUpdate={(e: any) => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={(e: any) => setDuration(e.currentTarget.duration)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={(e) => console.error("ReactPlayer error:", e)}
        config={{
          youtube: {
            playerVars: {
              showinfo: 0,
              controls: 1, // Enable controls briefly to prevent block, overlay handles hiding
              disablekb: 1,
              modestbranding: 1,
              rel: 0,
              origin: typeof window !== 'undefined' ? window.location.origin : ''
            }
          }
        }}
      />
      
      {/* Click overlay for play/pause */}
      <div 
        className="absolute inset-0 z-10"
        onClick={handlePlayPause}
      />
      
      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-brand-primary animate-spin" />
        </div>
      )}
      
      {/* Controls Overlay */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 transition-opacity duration-300 z-20",
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-4 mb-2">
           <span className="text-xs text-white/80 font-mono w-10">{formatTime(currentTime)}</span>
           <input
             type="range"
             min={0}
             max={duration || 100}
             value={currentTime}
             onChange={handleSeek}
             className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-brand-primary [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
           />
           <span className="text-xs text-white/80 font-mono w-10">{formatTime(duration)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => handleSkip(-10)} className="text-white hover:text-brand-secondary transition-colors" title="-10s">
              <Rewind className="w-5 h-5" />
            </button>
            <button onClick={handlePlayPause} className="text-white hover:text-brand-primary transition-colors">
              {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6" fill="currentColor" />}
            </button>
            <button onClick={() => handleSkip(10)} className="text-white hover:text-brand-secondary transition-colors" title="+10s">
              <FastForward className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 group/vol">
              <button onClick={() => setVolume(volume > 0 ? 0 : 1)} className="text-white hover:text-brand-secondary transition-colors">
                {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {onToggleChat && (
              <button onClick={onToggleChat} className="text-white hover:text-white/70 transition-colors relative" title="Live Chat">
                <MessageSquare className="w-5 h-5" />
                {hasUnreadChat && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                )}
              </button>
            )}
            {onChangeVideo && (
              <button onClick={onChangeVideo} className="text-white hover:text-brand-secondary transition-colors" title="Change Source">
                <Film className="w-5 h-5" />
              </button>
            )}
            <button onClick={toggleFullscreen} className="text-white hover:text-white/70 transition-colors">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {children}
    </div>
  );
}
