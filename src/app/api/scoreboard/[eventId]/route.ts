import { NextRequest } from 'next/server';
import { scoreboardCache } from '@/lib/scoreboard-cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  if (!eventId) {
    return Response.json({ error: 'Event ID required' }, { status: 400 });
  }

  try {
    console.log(`📊 REST API request for scoreboard: ${eventId}`);

    // Get scoreboard data (from cache or database)
    const scoreboardData = await scoreboardCache.calculateAndCache(eventId);

    return Response.json(scoreboardData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error(`❌ Error fetching scoreboard for event ${eventId}:`, error);
    
    return Response.json(
      { error: 'Failed to fetch scoreboard data' },
      { status: 500 }
    );
  }
} 