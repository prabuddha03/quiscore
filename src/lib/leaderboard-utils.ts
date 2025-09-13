import { prisma } from './prisma';

export interface TeamRank {
  teamId: string;
  rank: number;
  totalScore: number;
}

export interface ParticipationScore {
  participationId: string;
  score: number;
  teamRank: number;
}

/**
 * Calculate team ranks for an event based on total scores
 */
export async function calculateTeamRanks(eventId: string): Promise<TeamRank[]> {
  // Get all teams with their total scores
  const teams = await prisma.team.findMany({
    where: { eventId },
    include: {
      scores: true
    }
  });

  // Calculate total score for each team
  const teamScores = teams.map(team => ({
    teamId: team.id,
    totalScore: team.scores.reduce((sum, score) => sum + score.points, 0)
  }));

  // Sort by total score (descending) and assign ranks
  teamScores.sort((a, b) => b.totalScore - a.totalScore);
  
  const teamRanks: TeamRank[] = teamScores.map((team, index) => ({
    teamId: team.teamId,
    rank: index + 1,
    totalScore: team.totalScore
  }));

  return teamRanks;
}

/**
 * Calculate participation scores based on team ranks
 */
export async function calculateParticipationScores(eventId: string): Promise<ParticipationScore[]> {
  const teamRanks = await calculateTeamRanks(eventId);
  const totalTeams = teamRanks.length;
  
  // Get all participations for this event
  const participations = await prisma.participation.findMany({
    where: { eventId },
    include: { team: true }
  });

  const participationScores: ParticipationScore[] = [];

  for (const participation of participations) {
    const teamRank = teamRanks.find(tr => tr.teamId === participation.teamId);
    
    if (teamRank) {
      // Calculate score: base score (50) + ranking bonus: 25 * (totalTeams - rank + 1)
      const rankingBonus = 25 * (totalTeams - teamRank.rank + 1);
      const score = 50 + rankingBonus;
      
      participationScores.push({
        participationId: participation.id,
        score,
        teamRank: teamRank.rank
      });

      // Update participation with score and rank
      await prisma.participation.update({
        where: { id: participation.id },
        data: {
          score,
          teamRank: teamRank.rank
        }
      });
    }
  }

  return participationScores;
}

/**
 * Update leaderboard for a participant
 */


/**
 * Recalculate all leaderboards
 */
export async function recalculateAllLeaderboards() {
  const leaderboards = await prisma.leaderboard.findMany();

  for (const leaderboard of leaderboards) {
    // Get all participants from all teams in the specified events
    const participants = await prisma.participant.findMany({
      where: {
        participations: {
          some: {
            eventId: { in: leaderboard.eventIds }
          }
        }
      },
      include: {
        participations: {
          where: {
            eventId: { in: leaderboard.eventIds }
          },
          include: {
            team: true,
            event: true
          }
        }
      },
      distinct: ['id']  // Ensure each participant appears only once
    });

    console.log(`Found ${participants.length} unique participants across events:`, leaderboard.eventIds);

    // Delete existing leaderboard participants
    await prisma.leaderboardParticipant.deleteMany({
      where: { leaderboardId: leaderboard.id }
    });

    // Calculate team ranks for all events first
    const eventTeamRanks = new Map<string, TeamRank[]>();
    for (const eventId of leaderboard.eventIds) {
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
  }

  return { message: "All leaderboards recalculated" };
}
