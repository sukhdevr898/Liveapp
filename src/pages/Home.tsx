import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Users, Plus, Tv } from "lucide-react";
import { motion } from "framer-motion";
import { generateRoomId } from "../utils";

export default function Home() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState(() => localStorage.getItem("syncflix-name") || "");
  const [videos, setVideos] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/videos")
      .then(r => r.json())
      .then(data => setVideos(data.videos || []))
      .catch(err => console.error(err));
  }, []);

  const handleCreate = () => {
    if (!userName.trim()) return alert("Enter a name first");
    localStorage.setItem("syncflix-name", userName);
    const id = generateRoomId();
    navigate(`/room/${id}?name=${encodeURIComponent(userName)}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return alert("Enter a name first");
    if (!roomId.trim()) return alert("Enter room code");
    localStorage.setItem("syncflix-name", userName);
    navigate(`/room/${roomId}?name=${encodeURIComponent(userName)}`);
  };

  return (
    <div className="min-h-screen relative p-6 flex flex-col pt-12 pb-24 overflow-hidden bg-brand-bg">
      {/* Immersive Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-primary/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-secondary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: "2s" }} />
      <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] bg-brand-accent/20 rounded-full blur-[90px] pointer-events-none animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="max-w-md mx-auto w-full relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-10"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-[0_0_30px_rgba(108,99,255,0.4)]">
            <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">SyncFlix Live</h1>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1, delayChildren: 0.1 }}
          className="space-y-6"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 rounded-3xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
            <label className="block text-sm font-medium text-white/70 mb-3">Your Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-inner"
              placeholder="Enter your display name"
            />
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            className="w-full relative group rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(108,99,255,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-5 flex items-center justify-center gap-3 text-lg font-medium tracking-wide">
              <Plus className="w-6 h-6" />
              Create New Room
            </div>
          </motion.button>

          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleJoin} 
            className="glass-panel p-6 rounded-3xl space-y-4 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
            <h3 className="font-medium flex items-center gap-2 text-white/90">
              <Users className="w-5 h-5 text-brand-secondary" />
              Join Room
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="flex-1 bg-black/30 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary transition-all shadow-inner"
                placeholder="Room Code"
              />
              <button
                type="submit"
                className="bg-brand-surface border border-white/10 px-8 rounded-2xl hover:bg-white/10 transition-colors font-medium hover:text-brand-secondary"
              >
                Join
              </button>
            </div>
          </motion.form>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 rounded-3xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
            <h3 className="font-medium mb-5 flex items-center gap-2 text-white/90">
              <Tv className="w-5 h-5 text-brand-accent" />
              Available Videos
            </h3>
            {videos.length === 0 ? (
              <div className="text-white/40 text-sm italic py-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                No videos found in /videos
              </div>
            ) : (
              <ul className="space-y-3">
                {videos.map(v => (
                  <li key={v} className="bg-black/30 px-5 py-4 rounded-2xl text-sm truncate flex items-center gap-4 hover:bg-black/50 transition-colors cursor-default border border-white/5 shadow-inner">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Play className="w-3.5 h-3.5 text-white/70" />
                    </div>
                    <span className="text-white/80">{v}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
