import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/leaderboard/[id]/public - Get public leaderboard data
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const leaderboard = await prisma.leaderboard.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            participant: true,
            participations: {
              include: {
                team: true,
                event: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    createdAt: true
                  }
                }
              }
            }
          },
          orderBy: {
            totalScore: 'desc'
          }
        }
      }
    });

    if (!leaderboard) {
      return NextResponse.json({ error: "Leaderboard not found" }, { status: 404 });
    }

    // Format data for public consumption
    const formattedLeaderboard = {
      id: leaderboard.id,
      name: leaderboard.name,
      eventIds: leaderboard.eventIds,
      lastUpdated: leaderboard.updatedAt,
      participants: leaderboard.participants.map((lbParticipant, index) => ({
        rank: lbParticipant.rank || (index + 1),
        participant: {
          id: lbParticipant.participant.id,
          name: lbParticipant.participant.name,
          email: lbParticipant.participant.email,
          phone: lbParticipant.participant.phone
        },
        totalScore: lbParticipant.totalScore,
        eventScores: lbParticipant.participations.map(participation => ({
          eventId: participation.event?.id,
          eventName: participation.event?.name,
          eventType: participation.event?.type,
          teamName: participation.team?.name,
          teamRank: participation.teamRank,
          score: participation.score || 0,
          createdAt: participation.event?.createdAt
        }))
      }))
    };

    return NextResponse.json(formattedLeaderboard, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('Error fetching public leaderboard:', error);
    return NextResponse.json({ 
      error: "Failed to fetch leaderboard" 
    }, { status: 500 });
  }
}
