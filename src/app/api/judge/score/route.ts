import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { scoreboardCache } from "@/lib/scoreboard-cache";
import { calculateParticipationScores } from "@/lib/leaderboard-utils";

const scoreSchema = z.object({
  teamId: z.string(),
  roundId: z.string(),
  judgeId: z.string(),
  scores: z.array(
    z.object({
      criteriaId: z.string(),
      points: z.number(),
      pointers: z.string().optional(),
    })
  ),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validation = scoreSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.format() }, { status: 400 });
  }

  const { teamId, roundId, judgeId, scores } = validation.data;

  // Verify that the judgeId from the payload matches the logged-in user for this event
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) {
      return NextResponse.json({ error: "Round not found." }, { status: 404 });
  }

  const serverJudge = await prisma.judge.findUnique({
      where: {
          email_eventId: {
              email: session.user.email,
              eventId: round.eventId,
          }
      }
  });

  if (!serverJudge || serverJudge.id !== judgeId) {
      return NextResponse.json({ error: "Forbidden: You cannot submit scores for another judge." }, { status: 403 });
  }

  try {
    const transaction = scores.map(({ criteriaId, points, pointers }) => {
      return prisma.score.upsert({
        where: {
          teamId_criteriaId_judgeId: {
            teamId,
            criteriaId,
            judgeId,
          },
        },
        update: { points, pointers },
        create: {
          teamId,
          judgeId,
          criteriaId,
          points,
          pointers,
        },
      });
    });

    await prisma.$transaction(transaction);

    // Recalculate and broadcast updated scoreboard to SSE clients
    if (round.eventId) {
      try {
        console.log(`🎯 Score submitted for event ${round.eventId}, recalculating scoreboard...`);
        
        // Force refresh scoreboard cache and broadcast to SSE clients
        await scoreboardCache.calculateAndCache(round.eventId, true);
        
        // Calculate team ranks and participation scores for leaderboard
        await calculateParticipationScores(round.eventId);
        
        console.log(`📡 Scoreboard and leaderboard updated for event ${round.eventId}`);
      } catch (error) {
        console.error('Error broadcasting scoreboard update:', error);
        // Don't fail the request if broadcasting fails
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to save scores:", error);
    return NextResponse.json({ error: "Failed to save scores" }, { status: 500 });
  }
} 