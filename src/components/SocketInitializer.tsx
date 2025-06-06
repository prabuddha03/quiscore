"use client";

import { useEffect } from "react";

export function SocketInitializer() {
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        console.log("🚀 Auto-initializing Socket.IO server on app startup...");
        const response = await fetch("/api/socket");
        if (response.ok) {
          console.log("✅ Socket.IO server auto-initialized successfully");
        } else {
          console.error("❌ Failed to auto-initialize Socket.IO server");
        }
      } catch (error) {
        console.error("❌ Error auto-initializing Socket.IO server:", error);
      }
    };

    // Initialize Socket.IO server when app loads
    initializeSocket();
  }, []);

  return null; // This component doesn't render anything
} 