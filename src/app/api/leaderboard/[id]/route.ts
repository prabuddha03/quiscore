import { prisma } from "@/lib/prisma";
import { calculateTeamRanks, TeamRank } from "@/lib/leaderboard-utils";
import { NextResponse } from "next/server";

// GET /api/leaderboard/[id] - Get a specific leaderboard
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
                event: true
              }
            }
          }
        }
      }
    });

    if (!leaderboard) {
      return NextResponse.json({ error: "Leaderboard not found" }, { status: 404 });
    }

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}

// PUT /api/leaderboard/[id] - Update a leaderboard
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { eventIds } = await req.json();

    if (!eventIds || !Array.isArray(eventIds)) {
      return NextResponse.json({ 
        error: "eventIds array is required" 
      }, { status: 400 });
    }

    const leaderboard = await prisma.leaderboard.findUnique({
      where: { id: id },
      include: { participants: true }
    });

    if (!leaderboard) {
      return NextResponse.json({ error: "Leaderboard not found" }, { status: 404 });
    }

    // Get all participants from all teams in the specified events
    const participants = await prisma.participant.findMany({
      where: {
        participations: {
          some: {
            eventId: { in: eventIds }
          }
        }
      },
      include: {
        participations: {
          where: {
            eventId: { in: eventIds }
          },
          include: {
            team: true,
            event: true
          }
        }
      },
      distinct: ['id']  // Ensure each participant appears only once
    });

    console.log(`Found ${participants.length} unique participants across events:`, eventIds);

    // Delete existing leaderboard participants
    await prisma.leaderboardParticipant.deleteMany({
      where: { leaderboardId: id }
    });

    // Calculate team ranks for all events first
    const eventTeamRanks = new Map<string, TeamRank[]>();
    for (const eventId of eventIds) {
      console.log(`Calculating team ranks for event ${eventId}`);
      const teamRanks = await calculateTeamRanks(eventId);
      eventTeamRanks.set(eventId, teamRanks);
      console.log(`Event ${eventId} team ranks:`, teamRanks);
    }

    // Process each participant
    const leaderboardParticipants = [];
    for (const participant of participants) {
      let totalScore = 0;
      const participantParticipations = [];

      console.log(`Processing participant ${participant.name} with ${participant.participations.length} participations`);

      // Calculate score for each participation
      for (const participation of participant.participations) {
        if (participation.eventId && participation.teamId) {
          // Get team ranks for this event
          const teamRanks = eventTeamRanks.get(participation.eventId) || [];
          const teamRank = teamRanks.find((tr: TeamRank) => tr.teamId === participation.teamId);
          
          if (teamRank) {
            const totalTeams = teamRanks.length;
            // Calculate score: base score (50) + ranking bonus: 25 * (totalTeams - rank + 1)
            const rankingBonus = 25 * (totalTeams - teamRank.rank + 1);
            const participationScore = 50 + rankingBonus;
            totalScore += participationScore;
            
            console.log(`Participant ${participant.name}: Event ${participation.event?.name || 'Unknown'}, Team ${participation.team?.name || 'Unknown'}, Team Rank ${teamRank.rank}/${totalTeams}, Score: ${participationScore}`);
            
            // Update participation with team rank and score
            await prisma.participation.update({
              where: { id: participation.id },
              data: { 
                teamRank: teamRank.rank,
                score: participationScore 
              }
            });

            // Update the participation object for linking
            participation.teamRank = teamRank.rank;
            participation.score = participationScore;
            participantParticipations.push(participation);
          } else {
            console.log(`No team rank found for participant ${participant.name} in team ${participation.teamId} for event ${participation.eventId}`);
          }
        } else {
          console.log(`Participation ${participation.id} missing eventId or teamId:`, {
            eventId: participation.eventId,
            teamId: participation.teamId
          });
        }
      }

      // Create leaderboard participant entry
      const leaderboardParticipant = await prisma.leaderboardParticipant.create({
        data: {
          leaderboardId: id,
          participantId: participant.id,
          totalScore
        }
      });

      // Update participations to link them to the leaderboard participant
      if (participantParticipations.length > 0) {
        await prisma.participation.updateMany({
          where: {
            id: { in: participantParticipations.map(p => p.id) }
          },
          data: {
            leaderboardParticipantId: leaderboardParticipant.id
          }
        });
      }

      leaderboardParticipants.push(leaderboardParticipant);
    }

    // Calculate ranks
    leaderboardParticipants.sort((a, b) => b.totalScore - a.totalScore);
    for (let i = 0; i < leaderboardParticipants.length; i++) {
      await prisma.leaderboardParticipant.update({
        where: { id: leaderboardParticipants[i].id },
        data: { rank: i + 1 }
      });
    }

    // Update leaderboard
    const updatedLeaderboard = await prisma.leaderboard.update({
      where: { id: id },
      data: {
        eventIds
      },
      include: {
        participants: {
          include: {
            participant: true,
            participations: {
              include: {
                team: true,
                event: true
              }
            }
          },
          orderBy: {
            totalScore: 'desc'
          }
        }
      }
    });

    console.log(`Updated leaderboard ${id} with ${leaderboardParticipants.length} participants`);

    return NextResponse.json(updatedLeaderboard);
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return NextResponse.json({ error: "Failed to update leaderboard" }, { status: 500 });
  }
}

// DELETE /api/leaderboard/[id] - Delete a leaderboard
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await prisma.leaderboard.delete({
      where: { id: (await params).id }
    });

    return NextResponse.json({ message: "Leaderboard deleted successfully" });
  } catch (error) {
    console.error('Error deleting leaderboard:', error);
    return NextResponse.json({ error: "Failed to delete leaderboard" }, { status: 500 });
  }
}
