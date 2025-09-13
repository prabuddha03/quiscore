import { prisma } from "@/lib/prisma";
import { calculateTeamRanks, TeamRank } from "@/lib/leaderboard-utils";
import { NextResponse } from "next/server";

// GET /api/leaderboard - Get all leaderboards
export async function GET() {
  try {
    const leaderboards = await prisma.leaderboard.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json(leaderboards);
  } catch (error) {
    console.error('Error fetching leaderboards:', error);
    return NextResponse.json({ error: "Failed to fetch leaderboards" }, { status: 500 });
  }
}

// POST /api/leaderboard - Create a new leaderboard
export async function POST(req: Request) {
  try {
    const { name, eventIds } = await req.json();

    if (!name || !eventIds || !Array.isArray(eventIds)) {
      return NextResponse.json({ 
        error: "name and eventIds array are required" 
      }, { status: 400 });
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

    // Create leaderboard
    const leaderboard = await prisma.leaderboard.create({
      data: {
        name,
        eventIds
      }
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
          leaderboardId: leaderboard.id,
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

    console.log(`Created leaderboard "${name}" with ${leaderboardParticipants.length} participants`);

    // Return the created leaderboard with participants
    const createdLeaderboard = await prisma.leaderboard.findUnique({
      where: { id: leaderboard.id },
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

    return NextResponse.json(createdLeaderboard, { status: 201 });
  } catch (error) {
    console.error('Error creating leaderboard:', error);
    return NextResponse.json({ error: "Failed to create leaderboard" }, { status: 500 });
  }
}
