import React, { useState, useRef, useEffect } from "react";
import { Socket } from "socket.io-client";
import { ChatMessage } from "../types";
import { Send, X, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../utils";

interface ChatPanelProps {
  socket: Socket;
  chat: ChatMessage[];
  onClose?: () => void;
  className?: string;
}

export default function ChatPanel({ socket, chat, onClose, className }: ChatPanelProps) {
  const [msg, setMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (msg.trim()) {
      socket.emit("chat-message", msg);
      setMsg("");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={cn("flex flex-col bg-brand-surface/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden relative pointer-events-auto", className)}
    >
      <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-secondary" />
          <h3 className="font-semibold text-sm text-white/90 tracking-wide uppercase">Live Chat</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar min-h-0 relative bg-black/20">
        {/* Optional inner glow for immersion */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/5 via-transparent to-transparent pointer-events-none" />
        
        {chat.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-white/30 text-xs italic gap-2"
          >
            <MessageSquare className="w-8 h-8 opacity-20" />
            No messages yet. Say hi!
          </motion.div>
        )}
        {chat.map((c, idx) => {
                const isMe = c.userId === socket.id;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    key={c.id} 
                    className={cn("flex flex-col max-w-[85%] relative z-10", isMe ? "ml-auto items-end" : "mr-auto items-start")}
                  >
                     <span className="text-[10px] text-white/40 mb-1 ml-1 font-medium tracking-wide">{isMe ? "You" : c.userName}</span>
                     <div dir="auto" className={cn(
                       "px-4 py-2.5 rounded-2xl text-sm break-words shadow-md backdrop-blur-sm text-left",
                       isMe ? "bg-brand-primary text-white rounded-tr-sm border border-brand-primary/50 shadow-[0_4px_15px_rgba(108,99,255,0.3)]" : "bg-white/10 text-white rounded-tl-sm border border-white/5"
                     )}>
                       {c.text}
                     </div>
                  </motion.div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            
            <div className="p-4 bg-white/5 backdrop-blur-md border-t border-white/5">
              <form onSubmit={handleSend} className="flex gap-2 relative">
                <input
                  type="text"
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  placeholder="Type a message..."
                  dir="auto"
                  className="flex-1 bg-black/40 border border-white/10 rounded-full pl-5 pr-14 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-inner"
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit" 
                  disabled={!msg.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 w-10 flex items-center justify-center rounded-full bg-gradient-to-r from-brand-primary to-brand-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:grayscale shadow-[0_0_15px_rgba(108,99,255,0.4)]"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </motion.button>
              </form>
            </div>
          </motion.div>
  );
}
