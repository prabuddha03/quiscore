import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roundId, number, eventId } = await req.json();

  if (!roundId || !number || !eventId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const question = await prisma.question.create({
    data: {
      roundId,
      number,
    },
  });

  // TODO: Implement Socket.IO properly for real-time updates
  // For now, we'll skip the real-time updates

  return NextResponse.json(question, { status: 201 });
} 