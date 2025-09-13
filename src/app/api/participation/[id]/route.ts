import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/participation/[id] - Get a specific participation
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const participation = await prisma.participation.findUnique({
      where: { id },
      include: {
        participant: true,
        team: true,
        event: true
      }
    });

    if (!participation) {
      return NextResponse.json({ error: "Participation not found" }, { status: 404 });
    }

    return NextResponse.json(participation);
  } catch (error) {
    console.error('Error fetching participation:', error);
    return NextResponse.json({ error: "Failed to fetch participation" }, { status: 500 });
  }
}

// PUT /api/participation/[id] - Update a participation
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const participation = await prisma.participation.update({
      where: { id: id },
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

    return NextResponse.json(participation);
  } catch (error) {
    console.error('Error updating participation:', error);
    return NextResponse.json({ error: "Failed to update participation" }, { status: 500 });
  }
}

// DELETE /api/participation/[id] - Delete a participation
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.participation.delete({
      where: { id: id }
    });

    return NextResponse.json({ message: "Participation deleted successfully" });
  } catch (error) {
    console.error('Error deleting participation:', error);
    return NextResponse.json({ error: "Failed to delete participation" }, { status: 500 });
  }
}
