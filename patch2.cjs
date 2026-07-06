const fs = require('fs');
let code = fs.readFileSync('src/components/CallPanel.tsx', 'utf8');

code = code.replace(
  'import { Mic, MicOff, Video, VideoOff } from "lucide-react";',
  'import { Mic, MicOff, Video, VideoOff, SwitchCamera } from "lucide-react";'
);

code = code.replace(
  'const [audioEnabled, setAudioEnabled] = useState(false);',
  'const [audioEnabled, setAudioEnabled] = useState(false);\n  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");'
);

code = code.replace(
  'const videoConstraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: "user" };',
  'const videoConstraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode };'
);

const switchCameraMethod = `
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
    } catch(err) {
       console.error("Camera switch failed", err);
    }
  };
`;

code = code.replace(
  "const toggleMedia = async (type: 'video' | 'audio') => {",
  switchCameraMethod + "\n  const toggleMedia = async (type: 'video' | 'audio') => {"
);

code = code.replace(
  /<button onClick=\{\(\) => toggleMedia\('video'\)\} className=\{cn\("p-1\.5 rounded-full transition-all hover:scale-110 active:scale-95 shadow-sm", videoEnabled \? "bg-white\/20 text-white backdrop-blur-md" : "bg-red-500\/90 text-white shadow-\[0_0_15px_rgba\(239,68,68,0\.5\)\]"\)\}>\n             \{videoEnabled \? <Video className="w-3\.5 h-3\.5" \/> : <VideoOff className="w-3\.5 h-3\.5" \/>\}\n           <\/button>/m,
  `<button onClick={() => toggleMedia('video')} className={cn("p-1.5 rounded-full transition-all hover:scale-110 active:scale-95 shadow-sm", videoEnabled ? "bg-white/20 text-white backdrop-blur-md" : "bg-red-500/90 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]")}>
             {videoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
           </button>
           {videoEnabled && (
             <button onClick={switchCamera} className="p-1.5 rounded-full bg-white/20 text-white backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-sm">
               <SwitchCamera className="w-3.5 h-3.5" />
             </button>
           )}`
);

fs.writeFileSync('src/components/CallPanel.tsx', code);
