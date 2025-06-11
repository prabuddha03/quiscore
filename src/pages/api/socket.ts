/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { NextApiResponseServerIo } from "@/types";
import { getSession } from "next-auth/react";
import { prisma } from "@/lib/prisma";

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
          origin: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['polling', 'websocket'],
        allowEIO3: true
      });

      // Middleware to attach session to socket if it exists, but allow all connections.
      io.use(async (socket, next) => {
        try {
          const session = await getSession({ req: socket.request as NextApiRequest });
          if (session) {
            (socket as any).session = session;
          }
        } catch (error) {
            console.error("Error retrieving session in socket middleware:", error);
        }
        next();
      });

      io.on("connection", (socket) => {
        console.log("✅ Client connected:", socket.id);

        socket.on("join-room", (room) => {
          // Public scoreboards can be joined by anyone
          socket.join(room);
          console.log(`📍 Socket ${socket.id} joined room: ${room}`);
        });

        socket.on("leave-room", (room) => {
          socket.leave(room);
          console.log(`📤 Socket ${socket.id} left room: ${room}`);
        });

        socket.on("sort-order-changed", async (data) => {
          const session = (socket as any).session;
            
          // 1. Authentication: Check if user is logged in
          if (!session?.user?.id || !session?.user?.email) {
            console.error(`🚨 Unauthorized 'sort-order-changed' attempt from socket ${socket.id}. No session.`);
            socket.emit("error", { message: "Unauthorized: You must be logged in to perform this action." });
            return;
          }

          const { eventId, sortOrder } = data;
          if (!eventId || !sortOrder) {
              socket.emit("error", { message: "Invalid data for sort-order-changed." });
              return;
          }

          try {
              // 2. Authorization: Check if user is owner or editor of the event
              const event = await prisma.event.findUnique({
                  where: { id: eventId },
                  select: { createdBy: true, allowedEditors: true }
              });

              if (!event) {
                  socket.emit("error", { message: "Event not found." });
                  return;
              }

              const isOwner = event.createdBy === session.user.id;
              const isEditor = event.allowedEditors.includes(session.user.email);

              if (!isOwner && !isEditor) {
                  console.error(`🚨 Forbidden 'sort-order-changed' from user ${session.user.id} for event ${eventId}.`);
                  socket.emit("error", { message: "Forbidden: You do not have permission to perform this action." });
                  return;
              }
              
              console.log(`🔄 Sort order changed for event ${eventId} by user ${session.user.id}: ${sortOrder}`);
              
              // Broadcast to all clients in the event room
              socket.to(`event_${eventId}`).emit("sort-order-changed", {
                  eventId,
                  sortOrder
              });
              
              console.log(`📢 Broadcasted sort-order-changed to event_${eventId} room`);
          } catch(error) {
              console.error(`🚨 Error processing 'sort-order-changed' for event ${eventId}:`, error);
              socket.emit("error", { message: "An internal error occurred." });
          }
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