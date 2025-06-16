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

    const { name, email } = await req.json();

    if (!name || !email) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        const judge = await prisma.judge.create({
            data: {
                name,
                email,
                eventId,
            },
        });
        return NextResponse.json(judge, { status: 201 });
    } catch (error) {
        console.error('Failed to add judge:', error);
        // Check for unique constraint violation
        if ((error as any).code === 'P2002') {
            return NextResponse.json({ error: "A judge with this email already exists for this event." }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to add judge" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = params.id;
    const isOwner = await checkEventOwner(eventId, session.user.id);
    if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { judgeId } = await req.json();

    if (!judgeId) {
        return NextResponse.json({ error: "Missing judgeId" }, { status: 400 });
    }

    try {
        await prisma.judge.delete({
            where: {
                id: judgeId,
                // Ensure the judge belongs to the correct event as an extra precaution
                eventId: eventId,
            },
        });
        return NextResponse.json({ message: "Judge removed successfully" }, { status: 200 });
    } catch (error) {
        console.error('Failed to remove judge:', error);
        return NextResponse.json({ error: "Failed to remove judge" }, { status: 500 });
    }
} 