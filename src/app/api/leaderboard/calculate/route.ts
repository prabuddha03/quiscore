import { NextResponse } from "next/server";
import { calculateParticipationScores, recalculateAllLeaderboards } from "@/lib/leaderboard-utils";

// POST /api/leaderboard/calculate - Calculate leaderboard scores
export async function POST(req: Request) {
  try {
    const { eventId, recalculateAll } = await req.json();

    if (recalculateAll) {
      // Recalculate all leaderboards
      const leaderboards = await recalculateAllLeaderboards();
      return NextResponse.json({ 
        message: "All leaderboards recalculated successfully",
        leaderboards 
      });
    } else if (eventId) {
      // Calculate scores for a specific event
      const participationScores = await calculateParticipationScores(eventId);
      return NextResponse.json({ 
        message: `Leaderboard scores calculated for event ${eventId}`,
        participationScores 
      });
    } else {
      return NextResponse.json({ 
        error: "Either eventId or recalculateAll=true is required" 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error calculating leaderboard:', error);
    return NextResponse.json({ 
      error: "Failed to calculate leaderboard" 
    }, { status: 500 });
  }
}
