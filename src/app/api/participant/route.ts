import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/participant - Get all participants
export async function GET() {
  try {
    const participants = await prisma.participant.findMany({
      include: {
        participations: {
          include: {
            team: true,
            event: true
          }
        },
      }
    });
    return NextResponse.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }
}

// POST /api/participant - Create a new participant
export async function POST(req: Request) {
  try {
    const { name, email, phone } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    const participant = await prisma.participant.create({
      data: {
        name,
        email: email || null,
        phone
      },
      include: {
        participations: {
          include: {
            team: true,
            event: true
          }
        },
      }
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    console.error('Error creating participant:', error);
    return NextResponse.json({ error: "Failed to create participant" }, { status: 500 });
  }
}
