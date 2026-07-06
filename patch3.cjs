const fs = require('fs');
let code = fs.readFileSync('src/components/CallPanel.tsx', 'utf8');

const oldCheckVideo = `      const checkVideo = () => setHasVideo(stream.getVideoTracks().some(t => t.enabled && t.readyState === 'live'));
      checkVideo();
      stream.addEventListener('addtrack', checkVideo);
      stream.addEventListener('removetrack', checkVideo);
      return () => {
        stream.removeEventListener('addtrack', checkVideo);
        stream.removeEventListener('removetrack', checkVideo);
      };`;

const newCheckVideo = `      let tracks = stream.getVideoTracks();
      const checkVideo = () => {
        tracks = stream.getVideoTracks();
        setHasVideo(tracks.some(t => t.enabled && t.readyState === 'live'));
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
      };`;

code = code.replace(oldCheckVideo, newCheckVideo);
fs.writeFileSync('src/components/CallPanel.tsx', code);
