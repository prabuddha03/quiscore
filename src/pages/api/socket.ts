/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { NextApiResponseServerIo } from "@/types";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIo) => {
  console.log("📨 Socket.IO initialization request received");
  
  if (!res.socket.server.io) {
    console.log("🚀 Initializing Socket.IO server...");
    const path = "/api/socket/io";
    const httpServer: NetServer = res.socket.server as any;
    
    try {
      const io = new ServerIO(httpServer, {
        path: path,
        addTrailingSlash: false,
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['polling', 'websocket'],
        allowEIO3: true
      });

      io.on("connection", (socket) => {
        console.log("✅ Client connected:", socket.id);

        socket.on("join-room", (room) => {
          socket.join(room);
          console.log(`📍 Socket ${socket.id} joined room: ${room}`);
        });

        socket.on("leave-room", (room) => {
          socket.leave(room);
          console.log(`📤 Socket ${socket.id} left room: ${room}`);
        });

        socket.on("sort-order-changed", (data) => {
          const { eventId, sortOrder } = data;
          console.log(`🔄 Sort order changed for event ${eventId}: ${sortOrder}`);
          
          // Broadcast to all clients in the event room
          socket.to(`event_${eventId}`).emit("sort-order-changed", {
            eventId,
            sortOrder
          });
          
          console.log(`📢 Broadcasted sort-order-changed to event_${eventId} room`);
        });

        socket.on("disconnect", () => {
          console.log("❌ Client disconnected:", socket.id);
        });

        socket.on("error", (error) => {
          console.error("🚨 Socket error:", error);
        });
      });

      res.socket.server.io = io;
      // Store globally for access from other APIs
      (global as any).io = io;
      console.log("✅ Socket.IO server initialized successfully!");
      console.log(`🌐 Socket.IO server listening on ${path}`);
    } catch (error) {
      console.error("❌ Failed to initialize Socket.IO server:", error);
      return res.status(500).json({ error: "Failed to initialize Socket.IO server" });
    }
  } else {
    console.log("ℹ️ Socket.IO server already running");
  }
  
  res.status(200).json({ 
    status: "Socket.IO server ready",
    path: "/api/socket/io",
    timestamp: new Date().toISOString()
  });
};

export default ioHandler; 