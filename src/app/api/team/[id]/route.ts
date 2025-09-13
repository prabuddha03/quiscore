import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to find or create participant
async function findOrCreateParticipant(participantData: {
  name: string;
  email?: string;
  phone: string;
  id?: string;
}) {
  // Check if participant already exists with same phone number
  const existingParticipant = await prisma.participant.findFirst({
    where: {
      phone: participantData.phone,
      ...(participantData.email ? { email: participantData.email } : { email: null })
    }
  });

  if (existingParticipant) {
    console.log(`Found existing participant: ${existingParticipant.name} (ID: ${existingParticipant.id}) with same contact info`);
    return existingParticipant;
  } else {
    // Create new participant
    const participant = await prisma.participant.create({
      data: {
        name: participantData.name,
        email: participantData.email || null,
        phone: participantData.phone
      }
    });
    console.log(`Created new participant: ${participant.name} (ID: ${participant.id})`);
    return participant;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        participations: {
          include: {
            participant: true
          }
        },
        event: true
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    console.log(`Fetched team: ${team.name} with ${team.participations?.length || 0} participations`);
    if (team.participations && team.participations.length > 0) {
      team.participations.forEach((participation, index) => {
        console.log(`Participation ${index + 1}: Participant ${participation.participant?.name} (ID: ${participation.participant?.id}) in Team ${participation.teamId}`);
      });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, participants } = await request.json();

    if (!name && !participants) {
      return NextResponse.json(
        { error: 'Name or participants must be provided' },
        { status: 400 }
      );
    }

    // If participants are provided, we need to update them
    if (participants) {
      // First, get the current team to find the eventId
      const team = await prisma.team.findUnique({
        where: { id },
        include: { event: true }
      });

      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }

      // Delete existing participations for this team only
      await prisma.participation.deleteMany({
        where: { teamId: id }
      });

      // Process each participant
      for (const participantData of participants) {
        let participant;
        
        if (participantData.id) {
          // Update existing participant
          participant = await prisma.participant.update({
            where: { id: participantData.id },
            data: {
              name: participantData.name,
              email: participantData.email || null,
              phone: participantData.phone
            }
          });
          console.log(`Updated participant: ${participant.name} (ID: ${participant.id})`);
        } else {
          // Find or create participant (checks for duplicates by phone/email)
          participant = await findOrCreateParticipant(participantData);
        }

        // Check if participation already exists for this participant in this team
        const existingParticipation = await prisma.participation.findFirst({
          where: {
            participantId: participant.id,
            teamId: id
          }
        });

        if (existingParticipation) {
          console.log(`Participation already exists: Participant ${participant.id} in Team ${id} (Participation ID: ${existingParticipation.id})`);
        } else {
          // Create participation for this participant in this team
          const participation = await prisma.participation.create({
            data: {
              participantId: participant.id,
              teamId: id,
              eventId: team.eventId
            }
          });
          console.log(`Created participation: Participant ${participant.id} in Team ${id} for Event ${team.eventId} (Participation ID: ${participation.id})`);
        }
      }
    }
    
    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        ...(name && { name }),
      },
      include: {
        participations: {
          include: {
            participant: true
          }
        }
      }
    });

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
} 