import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Serve videos directory statically
  const videosPath = path.join(process.cwd(), "videos");
  if (!fs.existsSync(videosPath)) {
    fs.mkdirSync(videosPath, { recursive: true });
  }
  app.use("/videos", express.static(videosPath));

  app.get("/api/videos", (req, res) => {
    fs.readdir(videosPath, (err, files) => {
      let videos: string[] = [];
      if (!err) {
        videos = files.filter(file => file.endsWith(".mp4") || file.endsWith(".mkv") || file.endsWith(".webm"));
      }
      
      // Always provide a sample video if none exist locally
      if (videos.length === 0) {
        videos.push("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
      }
      
      res.json({ videos });
    });
  });

  // Rooms state
  const rooms = new Map<string, {
    id: string;
    video: string | null;
    time: number;
    isPlaying: boolean;
    users: { id: string; name: string }[];
    chat: { id: string; userId: string; userName: string; text: string; timestamp: string }[];
  }>();

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-room", ({ roomId, userName }) => {
      socket.join(roomId);
      let room = rooms.get(roomId);
      if (!room) {
        room = {
          id: roomId,
          video: null,
          time: 0,
          isPlaying: false,
          users: [],
          chat: []
        };
        rooms.set(roomId, room);
      }

      if (!room.users.find(u => u.id === socket.id)) {
         room.users.push({ id: socket.id, name: userName });
      }

      socket.emit("room-state", room);
      io.to(roomId).emit("users-changed", room.users);
      
      // Notify others in room for WebRTC
      socket.to(roomId).emit("user-joined", { userId: socket.id, userName });

      socket.on("change-video", (video) => {
        if (room) {
          room.video = video;
          room.time = 0;
          room.isPlaying = false;
          io.to(roomId).emit("room-state", room);
        }
      });

      socket.on("play", (time) => {
        if (room) {
          room.isPlaying = true;
          room.time = time;
          socket.to(roomId).emit("play", time);
        }
      });

      socket.on("pause", (time) => {
        if (room) {
          room.isPlaying = false;
          room.time = time;
          socket.to(roomId).emit("pause", time);
        }
      });

      socket.on("seek", (time) => {
        if (room) {
          room.time = time;
          socket.to(roomId).emit("seek", time);
        }
      });
      
      socket.on("sync", (time) => {
         if (room) {
            room.time = time;
         }
      });

      socket.on("chat-message", (message) => {
        if (room) {
          const newMsg = {
            id: Date.now().toString(),
            userId: socket.id,
            userName,
            text: message,
            timestamp: new Date().toISOString()
          };
          room.chat.push(newMsg);
          // keep last 100 messages
          if (room.chat.length > 100) room.chat.shift();
          
          io.to(roomId).emit("chat-message", newMsg);
        }
      });
      
      // WebRTC signaling
      socket.on("signal", (data) => {
        io.to(data.to).emit("signal", {
          from: socket.id,
          signal: data.signal
        });
      });

      socket.on("disconnect", () => {
        if (room) {
          const user = room.users.find(u => u.id === socket.id);
          room.users = room.users.filter(u => u.id !== socket.id);
          if (room.users.length === 0) {
            rooms.delete(roomId);
          } else {
            io.to(roomId).emit("users-changed", room.users);
            if (user) {
              socket.to(roomId).emit("user-left", { userId: socket.id, userName: user.name });
            }
          }
        }
      });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
