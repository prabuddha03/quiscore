import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, type, teams } = await req.json();

  if (!name || !type || !teams) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // Find or create the user first
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        }
      });
    }

    const event = await prisma.event.create({
      data: {
        name,
        type,
        createdBy: user.id, // Use the user ID instead of email
        allowedEditors: [session.user.email],
        teams: {
          create: Array.from({ length: teams }, (_, i) => ({
            name: `Team ${i + 1}`,
          })),
        },
      },
      include: {
        teams: true,
      }
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Event creation error:', error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export async function GET() {
  const events = await prisma.event.findMany({
    include: {
      teams: true,
      createdByUser: true,
    }
  });
  return NextResponse.json(events);
} 