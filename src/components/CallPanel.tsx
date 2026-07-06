import React, { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import Peer from "simple-peer";
import { User } from "../types";
import { Mic, MicOff, Video, VideoOff, SwitchCamera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../utils";

interface CallPanelProps {
  socket: Socket;
  users: User[];
  currentUserId: string;
}

export default function CallPanel({ socket, users, currentUserId }: CallPanelProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<{ peerId: string; peer: Peer.Instance; stream?: MediaStream }[]>([]);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const peersRef = useRef<{ peerId: string; peer: Peer.Instance; stream?: MediaStream }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  useEffect(() => {
    // Only request media when user explicitly enables it to save battery/perms
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const videoConstraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode };

  
  const switchCamera = async () => {
    if (!stream || !videoEnabled) return;
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    
    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        stream.removeTrack(videoTrack);
      }
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { ...videoConstraints, facingMode: newMode } });
      const newTrack = newStream.getVideoTracks()[0];
      stream.addTrack(newTrack);
      
      peersRef.current.forEach(({ peer }) => { 
        try { 
           if (videoTrack) peer.replaceTrack(videoTrack, newTrack, stream);
        } catch(e) {
           console.log("replaceTrack error fallback", e);
        } 
      });
      
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = null;
        myVideoRef.current.srcObject = stream;
      }
    } catch(err: any) {
       console.error("Camera switch failed", err);
       showError("Failed to switch camera.");
    }
  };

  const toggleMedia = async (type: 'video' | 'audio') => {
    try {
      let currentStream = stream;
      if (!currentStream) {
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video' ? videoConstraints : videoEnabled ? videoConstraints : false,
          audio: type === 'audio' ? true : audioEnabled
        });
        setStream(currentStream);
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = currentStream;
        }
      } else {
        if (type === 'video') {
           const videoTrack = currentStream.getVideoTracks()[0];
           if (videoTrack) {
             videoTrack.enabled = !videoEnabled;
           } else if (!videoEnabled) {
              const newStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
              const newTrack = newStream.getVideoTracks()[0];
              currentStream.addTrack(newTrack);
              peersRef.current.forEach(({ peer }) => { try { peer.addTrack(newTrack, currentStream!); } catch(e) {} });
           }
        }
        if (type === 'audio') {
           const audioTrack = currentStream.getAudioTracks()[0];
           if (audioTrack) {
             audioTrack.enabled = !audioEnabled;
           } else if (!audioEnabled) {
              const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const newTrack = newStream.getAudioTracks()[0];
              currentStream.addTrack(newTrack);
              peersRef.current.forEach(({ peer }) => { try { peer.addTrack(newTrack, currentStream!); } catch(e) {} });
           }
        }
      }

      if (type === 'video') setVideoEnabled(!videoEnabled);
      if (type === 'audio') setAudioEnabled(!audioEnabled);

      if (!stream) {
         // The stream was just acquired. Add it to all existing peers.
         peersRef.current.forEach(p => {
           try {
             p.peer.addStream(currentStream!);
           } catch(e) {
             currentStream!.getTracks().forEach(t => p.peer.addTrack(t, currentStream!));
           }
         });
      } else {
        // If stream existed but we added a new track, we need to add it to existing peers
        if (type === 'video' && !videoEnabled) {
           const newTrack = currentStream.getVideoTracks()[0];
           if (newTrack) peersRef.current.forEach(p => p.peer.addTrack(newTrack, currentStream!));
        }
        if (type === 'audio' && !audioEnabled) {
           const newTrack = currentStream.getAudioTracks()[0];
           if (newTrack) peersRef.current.forEach(p => p.peer.addTrack(newTrack, currentStream!));
        }
      }
    } catch (err: any) {
      console.error("Failed to get media", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        showError(`Permission denied for ${type}. Please allow access in your browser settings.`);
      } else {
        showError(`Could not access ${type}: ${err.message || "Unknown error"}`);
      }
    }
  };

  useEffect(() => {
    socket.on("user-joined", (payload) => {
      // payload is { userId, userName }
      const peer = createPeer(payload.userId, socket.id!, stream);
      peersRef.current.push({ peerId: payload.userId, peer });
      setPeers([...peersRef.current]);
    });

    socket.on("signal", (payload) => {
      const item = peersRef.current.find(p => p.peerId === payload.from);
      if (item) {
        item.peer.signal(payload.signal);
      } else {
        // incoming call
        const peer = new Peer({
          initiator: false,
          trickle: true,
          stream: stream || undefined,
          config: peerConfig
        });
        
        peersRef.current.push({ peerId: payload.from, peer }); // Push before signaling!
        
        peer.on("signal", signal => {
          socket.emit("signal", { to: payload.from, signal });
        });
        peer.on("stream", remoteStream => {
          const p = peersRef.current.find(p => p.peerId === payload.from);
          if (p) {
             p.stream = remoteStream;
             setPeers([...peersRef.current]);
          }
        });
        peer.on("track", (track, stream) => {
          const p = peersRef.current.find(p => p.peerId === payload.from);
          if (p) {
             p.stream = stream;
             setPeers([...peersRef.current]);
          }
        });
        peer.signal(payload.signal);
        setPeers([...peersRef.current]);
      }
    });

    socket.on("user-left", (payload) => {
      const id = typeof payload === 'string' ? payload : payload.userId;
      const peerObj = peersRef.current.find(p => p.peerId === id);
      if (peerObj) {
        peerObj.peer.destroy();
      }
      peersRef.current = peersRef.current.filter(p => p.peerId !== id);
      setPeers([...peersRef.current]);
    });

    return () => {
      socket.off("user-joined");
      socket.off("signal");
      socket.off("user-left");
    };
  }, [socket, stream]);

  const peerConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  };

  function createPeer(userToSignal: string, callerID: string, stream: MediaStream | null) {
    const peer = new Peer({
      initiator: true,
      trickle: true,
      stream: stream || undefined,
      config: peerConfig
    });
    peer.on("signal", signal => {
      socket.emit("signal", { to: userToSignal, signal });
    });
    peer.on("stream", remoteStream => {
      const p = peersRef.current.find(p => p.peerId === userToSignal);
      if (p) {
         p.stream = remoteStream;
         setPeers([...peersRef.current]);
      }
    });
    peer.on("track", (track, stream) => {
      const p = peersRef.current.find(p => p.peerId === userToSignal);
      if (p) {
         p.stream = stream;
         setPeers([...peersRef.current]);
      }
    });
    return peer;
  }

  function addPeer(incomingSignal: Peer.SignalData, callerID: string, stream: MediaStream | null) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream || undefined,
      config: peerConfig
    });
    peer.on("signal", signal => {
      socket.emit("signal", { to: callerID, signal });
    });
    peer.on("stream", remoteStream => {
       setPeers(prev => prev.map(p => p.peerId === callerID ? { ...p, stream: remoteStream } : p));
    });
    peer.signal(incomingSignal);
    return peer;
  }

  // The Live Users Strip
  return (
    <div className="flex-none p-4 flex gap-3 overflow-x-auto hide-scrollbar items-center bg-black/20 backdrop-blur-md border-y border-white/5 shadow-inner relative">
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="absolute top-4 left-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur-sm text-sm font-medium flex items-center gap-2"
          >
            <span>⚠️</span> {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-none w-24 h-32 md:w-32 md:h-44 rounded-2xl overflow-hidden relative glass-panel flex flex-col justify-end shadow-lg ring-1 ring-white/10"
      >
         <video 
           ref={myVideoRef} 
           autoPlay 
           muted 
           playsInline 
           className={cn("absolute inset-0 w-full h-full object-cover -z-10 transition-opacity duration-300", !videoEnabled && "opacity-0")}
         />
         {!videoEnabled && (
           <div className="absolute inset-0 flex items-center justify-center bg-brand-surface -z-10">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white font-bold tracking-widest shadow-lg">
                 ME
              </div>
           </div>
         )}
         <div className="bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 pb-2 flex justify-between">
           <button onClick={() => toggleMedia('audio')} className={cn("p-1.5 rounded-full transition-all hover:scale-110 active:scale-95 shadow-sm", audioEnabled ? "bg-white/20 text-white backdrop-blur-md" : "bg-red-500/90 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]")}>
             {audioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
           </button>
           <button onClick={() => toggleMedia('video')} className={cn("p-1.5 rounded-full transition-all hover:scale-110 active:scale-95 shadow-sm", videoEnabled ? "bg-white/20 text-white backdrop-blur-md" : "bg-red-500/90 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]")}>
             {videoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
           </button>
           {videoEnabled && (
             <button onClick={switchCamera} className="p-1.5 rounded-full bg-white/20 text-white backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-sm">
               <SwitchCamera className="w-3.5 h-3.5" />
             </button>
           )}
         </div>
      </motion.div>
      
      <AnimatePresence>
        {peers.map((peer, idx) => (
          <RemoteVideo key={peer.peerId} stream={peer.stream} userName={users.find(u => u.id === peer.peerId)?.name || "User"} />
        ))}
      </AnimatePresence>
    </div>
  );
}

const RemoteVideo: React.FC<{ stream?: MediaStream; userName: string; }> = ({ stream, userName }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(e => console.error("Playback failed", e));
      let tracks = stream.getVideoTracks();
      const checkVideo = () => {
        tracks = stream.getVideoTracks();
        setHasVideo(tracks.some(t => t.enabled && !t.muted && t.readyState === 'live'));
      };
      
      const setupTrackListeners = () => {
         tracks.forEach(t => {
            t.addEventListener('mute', checkVideo);
            t.addEventListener('unmute', checkVideo);
            t.addEventListener('ended', checkVideo);
         });
      };
      const cleanupTrackListeners = () => {
         tracks.forEach(t => {
            t.removeEventListener('mute', checkVideo);
            t.removeEventListener('unmute', checkVideo);
            t.removeEventListener('ended', checkVideo);
         });
      };
      
      const onStreamUpdate = () => {
         cleanupTrackListeners();
         checkVideo();
         setupTrackListeners();
      };
      
      onStreamUpdate();
      stream.addEventListener('addtrack', onStreamUpdate);
      stream.addEventListener('removetrack', onStreamUpdate);
      
      return () => {
        cleanupTrackListeners();
        stream.removeEventListener('addtrack', onStreamUpdate);
        stream.removeEventListener('removetrack', onStreamUpdate);
      };
    } else {
      setHasVideo(false);
    }
  }, [stream]);
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, x: -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, width: 0, margin: 0 }}
      className="flex-none w-24 h-32 md:w-32 md:h-44 rounded-2xl overflow-hidden relative glass-panel shadow-lg ring-1 ring-white/10"
    >
      <video 
        ref={ref} 
        autoPlay 
        playsInline 
        className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-300", hasVideo ? "opacity-100" : "opacity-0")} 
      />
      {!hasVideo && (
         <div className="absolute inset-0 flex items-center justify-center bg-brand-surface/80 backdrop-blur-sm z-0">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white font-bold text-xs md:text-sm uppercase tracking-widest shadow-inner ring-1 ring-white/20">
               {userName.substring(0,2)}
            </div>
         </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-2 md:p-3 z-10 flex items-center justify-center">
         <p className="text-[10px] md:text-xs text-white/95 font-medium truncate tracking-wider drop-shadow-md text-center">{userName}</p>
      </div>
    </motion.div>
  );
}
