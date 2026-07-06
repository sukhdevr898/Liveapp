import { Play } from "lucide-react";

export default function Splash() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-brand-bg z-50">
      <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-brand-primary to-brand-secondary shadow-[0_0_40px_rgba(108,99,255,0.4)] animate-pulse">
        <Play className="w-10 h-10 text-white ml-2" fill="currentColor" />
        <div className="absolute -inset-2 rounded-full border border-brand-secondary/30 animate-ping" />
      </div>
      <h1 className="mt-8 text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
        SyncFlix <span className="text-brand-secondary">Live</span>
      </h1>
      <div className="mt-8 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-brand-primary animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 rounded-full bg-brand-secondary animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 rounded-full bg-brand-accent animate-bounce" />
      </div>
    </div>
  );
}
