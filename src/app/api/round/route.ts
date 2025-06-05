import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, eventId, rules } = await req.json();

  if (!name || !eventId || !rules) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const round = await prisma.round.create({
    data: {
      name,
      eventId,
      rules,
    },
  });

  return NextResponse.json(round, { status: 201 });
} 