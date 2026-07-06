const fs = require('fs');
let code = fs.readFileSync('src/components/CallPanel.tsx', 'utf8');

code = code.replace(
  "setHasVideo(tracks.some(t => t.enabled && t.readyState === 'live'));",
  "setHasVideo(tracks.some(t => t.enabled && !t.muted && t.readyState === 'live'));"
);

fs.writeFileSync('src/components/CallPanel.tsx', code);
