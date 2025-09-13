import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/participation - Get all participations
export async function GET() {
  try {
    const participations = await prisma.participation.findMany({
      include: {
        participant: true,
        team: true,
        event: true
      }
    });
    return NextResponse.json(participations);
  } catch (error) {
    console.error('Error fetching participations:', error);
    return NextResponse.json({ error: "Failed to fetch participations" }, { status: 500 });
  }
}

// POST /api/participation - Create a new participation
export async function POST(req: Request) {
  try {
    const { participantId, teamId, eventId, externalId, score } = await req.json();

    if (!participantId || !teamId || !eventId) {
      return NextResponse.json({ 
        error: "participantId, teamId, and eventId are required" 
      }, { status: 400 });
    }

    // Verify that the participant, team, and event exist
    const participant = await prisma.participant.findUnique({
      where: { id: participantId }
    });
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if participation already exists
    const existingParticipation = await prisma.participation.findFirst({
      where: {
        participantId,
        teamId,
        eventId
      }
    });

    if (existingParticipation) {
      return NextResponse.json({ 
        error: "Participation already exists for this participant, team, and event" 
      }, { status: 400 });
    }

    const participation = await prisma.participation.create({
      data: {
        participantId,
        teamId,
        eventId,
        externalId: externalId || null,
        score: score || null
      },
      include: {
        participant: true,
        team: true,
        event: true
      }
    });

    return NextResponse.json(participation, { status: 201 });
  } catch (error) {
    console.error('Error creating participation:', error);
    return NextResponse.json({ error: "Failed to create participation" }, { status: 500 });
  }
}
