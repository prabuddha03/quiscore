import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

async function checkEventOwner(eventId: string, userId: string) {
    const event = await prisma.event.findFirst({
        where: { id: eventId, createdBy: userId },
    });
    return !!event;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string, criteriaId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId, criteriaId } = await params;
    const isOwner = await checkEventOwner(eventId, session.user.id);
    if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, maxPoints } = await req.json();

    try {
        const updatedCriteria = await prisma.criteria.update({
            where: { id: criteriaId },
            data: { name, maxPoints },
        });
        return NextResponse.json(updatedCriteria, { status: 200 });
    } catch (error) {
        console.error('Failed to update criteria:', error);
        return NextResponse.json({ error: "Failed to update criteria" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, criteriaId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId, criteriaId } = await params;
    const isOwner = await checkEventOwner(eventId, session.user.id);
    if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        await prisma.criteria.delete({
            where: { id: criteriaId },
        });
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete criteria:', error);
        return NextResponse.json({ error: "Failed to delete criteria" }, { status: 500 });
    }
} 