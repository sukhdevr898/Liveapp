import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { ChevronLeft, Share2, LogOut, Clapperboard, Check, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Player from "../components/Player";
import CallPanel from "../components/CallPanel";
import ChatPanel from "../components/ChatPanel";
import { RoomState, ChatMessage, User } from "../types";

export default function Room() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const userName = searchParams.get("name") || "Anonymous";
  const navigate = useNavigate();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [videos, setVideos] = useState<string[]>([]);
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const [showChatPopup, setShowChatPopup] = useState(false);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [toasts, setToasts] = useState<{id: string, text: string}[]>([]);

  const addToast = (text: string) => {
    const newId = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id: newId, text }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newId));
    }, 4000);
  };

  useEffect(() => {
    if (showChatPopup) {
      setHasUnreadChat(false);
    }
  }, [showChatPopup]);

  useEffect(() => {
    fetch("/api/videos")
      .then(r => r.json())
      .then(data => setVideos(data.videos || []))
      .catch(console.error);

    const s = io("/", { transports: ["websocket"] });
    setSocket(s);


    s.on("room-state", (state: RoomState) => {
      setRoomState(state);
      if (state.chat) {
        setChat(state.chat);
      }
    });

    s.on("users-changed", (newUsers: User[]) => {
      setUsers(newUsers);
    });

    s.on("user-joined", (payload: { userId: string, userName: string }) => {
      addToast(`👋 ${payload.userName} joined the room`);
    });

    s.on("user-left", (payload: { userId: string, userName: string }) => {
      addToast(`🚪 ${payload.userName} left the room`);
    });

    s.on("chat-message", (msg: ChatMessage) => {
      setChat(prev => [...prev, msg]);
      setHasUnreadChat(prev => !showChatPopup ? true : prev);
    });

    return () => {
      s.disconnect();
    };
  }, [id, userName]);
  useEffect(() => {
    if (socket && id) {
      socket.emit("join-room", { roomId: id, userName });
    }
  }, [socket, id, userName]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(id || "");
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleChangeVideo = (vid: string) => {
    if (socket) {
      socket.emit("change-video", vid);
    }
    setShowVideoSelector(false);
  };

  if (!socket || !roomState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-brand-primary/20 blur-3xl rounded-full animate-pulse" />
        <div className="text-brand-secondary font-medium tracking-widest uppercase text-sm z-10 animate-pulse">Initializing Room...</div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="min-h-screen bg-transparent overflow-x-hidden flex flex-col pb-6"
    >
      {/* Header */}
      <motion.header 
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        className="flex-none h-16 flex items-center justify-between px-4 sm:px-6 glass-panel z-50 sticky top-0 border-b border-white/5"
      >
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="font-semibold text-sm tracking-wide flex items-center gap-2">
              Room <span className="text-brand-primary">{id}</span>
              <button onClick={handleCopyId} className="text-white/50 hover:text-white transition-colors">
                {copiedId ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] text-white/50 uppercase tracking-wider">{users.length} connected</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleCopyLink} className="p-2.5 text-brand-secondary bg-white/5 rounded-xl hover:bg-white/10 transition-all shadow-sm">
            {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
          </button>
          <button onClick={() => navigate("/")} className="p-2.5 text-red-400 bg-white/5 rounded-xl hover:bg-white/10 hover:bg-red-500/10 hover:text-red-300 transition-all shadow-sm">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* Video Area */}
      <div className="flex-none w-full bg-black relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] aspect-video lg:h-[60vh] lg:w-auto z-40 sticky top-16">
        {roomState.video ? (
          <Player 
            socket={socket} 
            roomState={roomState} 
            onChangeVideo={() => setShowVideoSelector(true)} 
            onToggleChat={() => setShowChatPopup(!showChatPopup)}
            hasUnreadChat={hasUnreadChat}
          >
            <AnimatePresence>
              {showChatPopup && (
                <div className="absolute left-4 right-4 bottom-20 md:left-auto md:right-4 md:bottom-24 md:w-80 max-h-[60%] flex flex-col z-50 pointer-events-auto">
                  <ChatPanel socket={socket} chat={chat} onClose={() => setShowChatPopup(false)} className="h-[400px]" />
                </div>
              )}
            </AnimatePresence>
          </Player>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-6 bg-gradient-to-b from-transparent to-brand-bg/50">
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <Clapperboard className="w-16 h-16 opacity-30" />
            </motion.div>
            <button 
              onClick={() => setShowVideoSelector(true)}
              className="px-8 py-3 bg-brand-primary text-white rounded-full font-medium shadow-[0_0_30px_rgba(108,99,255,0.3)] hover:shadow-[0_0_40px_rgba(108,99,255,0.5)] transition-all neon-border tracking-wide text-sm uppercase"
            >
              Select Source
            </button>
          </div>
        )}

        {/* Video Selector Overlay */}
        <AnimatePresence>
          {showVideoSelector && (
            <motion.div 
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              className="absolute inset-0 bg-black/60 z-20 flex flex-col p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-medium text-lg tracking-tight">Available Sources</h3>
                <button onClick={() => setShowVideoSelector(false)} className="text-white/50 hover:text-white transition-colors text-sm uppercase tracking-widest">Close</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = (new FormData(e.currentTarget).get('url') as string)?.trim();
                    if (input) handleChangeVideo(input);
                  }}
                  className="flex gap-2 mb-4"
                >
                  <input
                    name="url"
                    type="text"
                    placeholder="Enter direct or YouTube URL..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-inner"
                  />
                  <button type="submit" className="px-4 py-3 bg-brand-primary text-white rounded-xl text-sm font-medium hover:bg-brand-primary/80 transition-colors">
                    Load
                  </button>
                </form>
                {videos.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-center text-white/30 uppercase tracking-widest border border-dashed border-white/10 px-8 py-4 rounded-2xl">No sources found</p>
                  </div>
                )}
                {videos.map((vid, idx) => (
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={vid}
                    onClick={() => handleChangeVideo(vid)}
                    className="w-full text-left px-5 py-4 bg-white/5 rounded-2xl text-sm hover:bg-white/10 transition-colors border border-white/5 shadow-sm flex items-center gap-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-brand-secondary" />
                    {vid}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content Area (Calls & Chat) */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 flex flex-col lg:flex-row min-h-0 relative z-0 gap-4 p-4"
      >
        <div className="flex-1 flex flex-col min-h-0">
          <CallPanel socket={socket} users={users} currentUserId={socket.id} />
        </div>
        
        {/* Overall Chat View - hidden on mobile, available via popup */}
        <div className="hidden lg:flex w-80 xl:w-96 flex-col min-h-0">
           <ChatPanel socket={socket} chat={chat} className="h-full rounded-2xl border-white/5" />
        </div>
      </motion.div>

      {/* Toasts Island */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-6 py-2.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.3)] text-sm font-medium tracking-wide flex items-center justify-center whitespace-nowrap"
            >
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
