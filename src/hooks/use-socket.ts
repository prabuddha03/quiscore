/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import io from "socket.io-client";

export const useSocket = (serverPath: string) => {
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;
    let retryTimeout: NodeJS.Timeout;
    
    const initializeSocket = async () => {
      try {
        console.log("🔄 Ensuring Socket.IO server is ready...");
        
        // Keep trying to initialize server until it's ready
        const ensureServerReady = async (): Promise<boolean> => {
          try {
            const response = await fetch("/api/socket");
            return response.ok;
          } catch (error) {
            console.log("Server not ready yet, retrying...");
            return false;
          }
        };

        // Wait for server to be ready with retries
        let serverReady = false;
        let serverRetries = 0;
        while (!serverReady && serverRetries < 5) {
          serverReady = await ensureServerReady();
          if (!serverReady) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            serverRetries++;
          }
        }

        if (!serverReady) {
          throw new Error("Failed to initialize Socket.IO server after multiple attempts");
        }

        console.log("✅ Socket.IO server is ready, connecting client...");
        
        // Create socket connection
        const connectSocket = () => {
          const socketInstance = io(serverPath, {
            path: "/api/socket/io",
            timeout: 10000,
            forceNew: true,
          });

          socketInstance.on("connect", () => {
            console.log("✅ Socket connected:", socketInstance.id);
            setIsConnected(true);
            retryCount = 0; // Reset retry count on successful connection
          });

          socketInstance.on("disconnect", () => {
            console.log("❌ Socket disconnected");
            setIsConnected(false);
          });

          socketInstance.on("connect_error", (error: Error) => {
            console.error("❌ Socket connection error:", error);
            setIsConnected(false);
            
            // Retry connection if we haven't exceeded max retries
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`🔄 Retrying socket connection... (${retryCount}/${maxRetries})`);
              retryTimeout = setTimeout(() => {
                socketInstance.connect();
              }, 2000 * retryCount); // Exponential backoff
            } else {
              console.error("❌ Max retries reached, giving up");
            }
          });

          setSocket(socketInstance);
        };

        // Connect immediately since server is ready
        connectSocket();
        
      } catch (error) {
        console.error("❌ Failed to initialize Socket.IO:", error);
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [serverPath, socket]);

  return { socket, isConnected };
}; 