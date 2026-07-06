const fs = require('fs');
let code = fs.readFileSync('src/components/CallPanel.tsx', 'utf8');

const remoteVideoRegex = /const RemoteVideo: React\.FC[^]*?\}\);\n\}/m;

const newRemoteVideo = `const RemoteVideo: React.FC<{ stream?: MediaStream; userName: string; }> = ({ stream, userName }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(e => console.error("Playback failed", e));
      const checkVideo = () => setHasVideo(stream.getVideoTracks().some(t => t.enabled && t.readyState === 'live'));
      checkVideo();
      stream.addEventListener('addtrack', checkVideo);
      stream.addEventListener('removetrack', checkVideo);
      return () => {
        stream.removeEventListener('addtrack', checkVideo);
        stream.removeEventListener('removetrack', checkVideo);
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
}`;

code = code.replace(remoteVideoRegex, newRemoteVideo);
fs.writeFileSync('src/components/CallPanel.tsx', code);
