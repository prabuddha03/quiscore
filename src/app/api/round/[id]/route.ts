/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const round = await prisma.round.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            scores: true,
          },
        },
      },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    return NextResponse.json(round);
  } catch (error) {
    console.error("Error fetching round:", error);
    return NextResponse.json(
      { error: "Failed to fetch round" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: any }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, rules } = body;

    if (!name || !rules) {
        return NextResponse.json({ error: "Missing name or rules" }, { status: 400 });
    }

    const updatedRound = await prisma.round.update({
      where: { id },
      data: {
        name,
        rules,
      },
    });

    return NextResponse.json(updatedRound);
  } catch (error) {
    console.error(`Failed to update round ${params.id}:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 