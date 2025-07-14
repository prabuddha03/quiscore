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
    start(controller) {
      console.log(`📡 SSE client connected for event: ${eventId}`);

      // Send initial data if available in cache
      const sendInitialData = async () => {
        try {
          const cachedData = scoreboardCache.get(eventId);
          if (cachedData) {
            controller.enqueue(`data: ${JSON.stringify(cachedData)}\n\n`);
          } else {
            // Fetch fresh data if not in cache
            const freshData = await scoreboardCache.calculateAndCache(eventId);
            controller.enqueue(`data: ${JSON.stringify(freshData)}\n\n`);
          }
        } catch (error) {
          console.error('Error sending initial SSE data:', error);
          controller.enqueue(`event: error\ndata: {"error": "Failed to load initial data"}\n\n`);
        }
      };

      // Send initial data
      sendInitialData();

      // Subscribe to future updates
      const unsubscribe = scoreboardCache.subscribe(eventId, (newData) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(newData)}\n\n`);
        } catch (error) {
          console.error('Error sending SSE update:', error);
        }
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(`: heartbeat\n\n`);
        } catch (error) {
          // Connection closed, cleanup
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
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
} 