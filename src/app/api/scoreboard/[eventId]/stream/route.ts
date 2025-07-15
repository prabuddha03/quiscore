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

      // Send connection established message first
      const serverTimestamp = Date.now();
      const connectionMsg = `event: connected\ndata: {"status": "connected", "eventId": "${eventId}", "serverTime": "${new Date().toISOString()}", "timestamp": ${serverTimestamp}}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectionMsg));
      console.log(`📡 SSE connection confirmation sent for event: ${eventId} at ${new Date().toISOString()}`);

      // Send immediate ping to ensure connection is working
      setTimeout(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`event: ping\ndata: {"ping": "pong", "serverTime": "${new Date().toISOString()}"}\n\n`));
          console.log(`📡 SSE ping sent for event: ${eventId}`);
        } catch (error) {
          console.error('Error sending SSE ping:', error);
        }
      }, 100); // Send ping after 100ms

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

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`: heartbeat\n\n`));
          console.log(`💓 SSE heartbeat sent for event: ${eventId}`);
        } catch (error) {
          // Connection closed, cleanup
          console.log(`💔 SSE heartbeat failed for event: ${eventId}, cleaning up`);
          clearInterval(heartbeatInterval);
          unsubscribe();
        }
      }, 30000);

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
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Credentials': 'true',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Content-Encoding': 'identity', // Prevent gzip compression
    },
  });
} 