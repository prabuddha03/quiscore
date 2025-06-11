import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, players } = await request.json();

    if (!name && !players) {
      return NextResponse.json(
        { error: 'Name or players must be provided' },
        { status: 400 }
      );
    }
    
    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(players && { players }),
      },
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