import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId, questionId, method, points, eventId } = await req.json();

  if (!teamId || !questionId || !method || points === undefined || !eventId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const score = await prisma.score.create({
    data: {
      teamId,
      questionId,
      method,
      points,
    },
  });

  // TODO: Implement Socket.IO properly for real-time updates
  // For now, we'll skip the real-time updates

  return NextResponse.json(score, { status: 201 });
} 