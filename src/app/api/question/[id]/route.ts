import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// DELETE /api/question/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const questionId = (await params).id;

  try {
    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      const questionToDelete = await tx.question.findUnique({
        where: { id: questionId },
        select: {
          number: true,
          roundId: true,
          round: {
            select: {
              event: {
                select: {
                  createdBy: true,
                },
              },
            },
          },
        },
      });

      if (!questionToDelete) {
        throw new Error('Question not found');
      }

      // Check if user is the creator of the event
      if (questionToDelete.round.event.createdBy !== session.user.id) {
        throw new Error('Forbidden');
      }

      // Delete the question
      await tx.question.delete({
        where: { id: questionId },
      });

      // Get all questions in the same round with a higher number
      const questionsToUpdate = await tx.question.findMany({
        where: {
          roundId: questionToDelete.roundId,
          number: {
            gt: questionToDelete.number,
          },
        },
        orderBy: {
          number: 'asc',
        },
      });

      // Update their numbers sequentially
      for (const question of questionsToUpdate) {
        await tx.question.update({
          where: { id: question.id },
          data: { number: question.number - 1 },
        });
      }

      return { message: 'Question deleted and numbers updated successfully' };
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Error deleting question:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    if (errorMessage === 'Question not found') {
        return NextResponse.json({ error: errorMessage }, { status: 404 });
    }
    if (errorMessage === 'Forbidden') {
        return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'An error occurred while deleting the question.' },
      { status: 500 }
    );
  }
} 