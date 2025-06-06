/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Server as SocketIOServer } from "socket.io";

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

  // Emit Socket.IO event for real-time updates
  try {
    const io = (global as any).io as SocketIOServer;
    if (io) {
      io.to(`event_${eventId}`).emit("score-updated", {
        eventId,
        teamId,
        score
      });
      console.log(`Emitted score-updated event for event ${eventId}`);
    }
  } catch (error) {
    console.log("Socket.IO not initialized yet, skipping real-time update");
  }

  return NextResponse.json(score, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId, questionId, method, points, eventId } = await req.json();

  if (!teamId || !questionId || !method || points === undefined || !eventId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Use upsert to update existing score or create new one if it doesn't exist
  const score = await prisma.score.upsert({
    where: {
      teamId_questionId: {
        teamId,
        questionId,
      },
    },
    update: {
      method,
      points,
    },
    create: {
      teamId,
      questionId,
      method,
      points,
    },
  });

  // Emit Socket.IO event for real-time updates
  try {
    const io = (global as any).io as SocketIOServer;
    if (io) {
      io.to(`event_${eventId}`).emit("score-updated", {
        eventId,
        teamId,
        score
      });
      console.log(`Emitted score-updated event for event ${eventId}`);
    }
  } catch (error) {
    console.log("Socket.IO not initialized yet, skipping real-time update");
  }

  return NextResponse.json(score, { status: 200 });
} 