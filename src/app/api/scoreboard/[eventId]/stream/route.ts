import { NextRequest } from 'next/server';
import { scoreboardCache } from '@/lib/scoreboard-cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  if (!eventId) {
    return new Response('Event ID required', { status: 400 });
  }

  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      console.log(`📡 SSE client connected for event: ${eventId}`);

      // Send connection established message first with minimal padding to force flush
      const serverTimestamp = Date.now();
      const padding = ' '.repeat(512); // 512B padding to force proxy flush (lighter)
      const connectionMsg = `event: connected\ndata: {"status": "connected", "eventId": "${eventId}", "timestamp": ${serverTimestamp}}\n\n${padding}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectionMsg));
      console.log(`📡 SSE connection confirmation sent for event: ${eventId}`);

      // Send single ping to test connection (lightweight)
      setTimeout(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`event: ping\ndata: {"ping": "pong"}\n\n`));
          console.log(`📡 SSE ping sent for event: ${eventId}`);
        } catch (error) {
          console.error('Error sending SSE ping:', error);
        }
      }, 200); // Single ping after 200ms

      // Send initial data if available in cache
      const sendInitialData = async () => {
        try {
          const cachedData = scoreboardCache.get(eventId);
          if (cachedData) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(cachedData)}\n\n`));
            console.log(`📡 SSE initial cached data sent for event: ${eventId}`);
          } else {
            // Fetch fresh data if not in cache
            const freshData = await scoreboardCache.calculateAndCache(eventId);
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(freshData)}\n\n`));
            console.log(`📡 SSE initial fresh data sent for event: ${eventId}`);
          }
        } catch (error) {
          console.error('Error sending initial SSE data:', error);
          controller.enqueue(new TextEncoder().encode(`event: error\ndata: {"error": "Failed to load initial data"}\n\n`));
        }
      };

      // Send initial data (properly await it)
      await sendInitialData();

      // Subscribe to future updates
      const unsubscribe = scoreboardCache.subscribe(eventId, (newData) => {
        try {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(newData)}\n\n`));
          console.log(`📡 SSE update sent for event: ${eventId}`, {
            teamsCount: newData.teams?.length || 0,
            lastUpdated: newData.lastUpdated
          });
        } catch (error) {
          console.error('Error sending SSE update:', error);
        }
      });

      // Send heartbeat every 15 seconds to keep connection alive (lighter)
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeatMsg = `: heartbeat\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeatMsg));
          console.log(`💓 SSE heartbeat sent for event: ${eventId}`);
        } catch (error) {
          // Connection closed, cleanup immediately
          console.log(`💔 SSE heartbeat failed for event: ${eventId}, cleaning up`);
          clearInterval(heartbeatInterval);
          unsubscribe();
        }
      }, 15000); // Lighter heartbeat frequency

      // Store cleanup function for when connection closes
      (request as NextRequest & { cleanup?: () => void }).cleanup = () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        console.log(`📡 SSE client disconnected for event: ${eventId}`);
      };
    },

    cancel() {
      // Called when client disconnects
      const cleanupFn = (request as NextRequest & { cleanup?: () => void }).cleanup;
      if (cleanupFn) {
        cleanupFn();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Credentials': 'true',
      
      // DigitalOcean App Platform specific headers
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'X-Proxy-Buffering': 'no', // Alternative nginx header
      'Proxy-Buffering': 'no', // Generic proxy header
      'X-Nginx-Proxy': 'no-buffer', // Specific nginx instruction
      
      // Force streaming
      'Content-Encoding': 'identity', // Prevent gzip compression
      'Transfer-Encoding': 'chunked', // Force chunked encoding
      'X-Content-Type-Options': 'nosniff', // Prevent MIME type sniffing
      'Expires': '0', // Prevent caching
      'Pragma': 'no-cache', // HTTP/1.0 compatibility
      
      // App Platform specific
      'X-Vercel-No-Cache': '1', // Works for similar platforms
      'X-Robots-Tag': 'noindex, nofollow', // Prevent indexing
    },
  });
} 