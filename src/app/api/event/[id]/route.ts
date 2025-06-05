import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: {
      id,
    },
    include: {
      teams: {
        include: {
          scores: true,
        },
      },
      rounds: {
        include: {
          questions: {
            include: {
              scores: true,
            },
          },
        },
      },
    },
  });
  return NextResponse.json(event);
} 