import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getIo } from "@/lib/socket";

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

    // Notify clients
    if (round.eventId) {
      const io = getIo();
      if (io) {
        io.to(`event_${round.eventId}`).emit("score-updated");
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to save scores:", error);
    return NextResponse.json({ error: "Failed to save scores" }, { status: 500 });
  }
} 