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

    const scores = await prisma.score.findMany({
      where: { questionId: id },
      include: {
        team: true,
      },
    });

    return NextResponse.json(scores);
  } catch (error) {
    console.error("Error fetching question scores:", error);
    return NextResponse.json(
      { error: "Failed to fetch question scores" },
      { status: 500 }
    );
  }
} 