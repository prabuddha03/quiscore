import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

async function checkEventOwner(eventId: string, userId: string) {
    const event = await prisma.event.findFirst({
        where: {
            id: eventId,
            createdBy: userId,
        },
    });
    return !!event;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = params.id;
    const isOwner = await checkEventOwner(eventId, session.user.id);
    if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, roundId, maxPoints } = await req.json();

    if (!name || !roundId) {
        return NextResponse.json({ error: "Missing required fields: name and roundId" }, { status: 400 });
    }

    try {
        const criteria = await prisma.criteria.create({
            data: {
                name,
                roundId,
                maxPoints,
            },
        });
        return NextResponse.json(criteria, { status: 201 });
    } catch (error) {
        console.error('Failed to add criteria:', error);
        return NextResponse.json({ error: "Failed to add criteria" }, { status: 500 });
    }
} 