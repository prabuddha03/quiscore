import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/participant/[id] - Get a specific participant
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const participant = await prisma.participant.findUnique({
      where: { id },
      include: {
        participations: {
          include: {
            team: true,
            event: true
          }
        },
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    return NextResponse.json(participant);
  } catch (error) {
    console.error('Error fetching participant:', error);
    return NextResponse.json({ error: "Failed to fetch participant" }, { status: 500 });
  }
}

// PUT /api/participant/[id] - Update a participant
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, email, phone } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    const participant = await prisma.participant.update({
      where: { id: id },
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

    return NextResponse.json(participant);
  } catch (error) {
    console.error('Error updating participant:', error);
    return NextResponse.json({ error: "Failed to update participant" }, { status: 500 });
  }
}

// DELETE /api/participant/[id] - Delete a participant
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check if participant has any participations
    const participations = await prisma.participation.findMany({
      where: { participantId: id }
    });

    if (participations.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete participant with existing participations. Remove participations first." 
      }, { status: 400 });
    }

    await prisma.participant.delete({
      where: { id: id }
    });

    return NextResponse.json({ message: "Participant deleted successfully" });
  } catch (error) {
    console.error('Error deleting participant:', error);
    return NextResponse.json({ error: "Failed to delete participant" }, { status: 500 });
  }
}
