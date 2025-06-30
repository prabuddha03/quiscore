import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const events = await prisma.event.findMany({
            where: {
                judges: {
                    some: {
                        email: session.user.email,
                    },
                },
            },
            include: {
                judges: true,
                rounds: true,
                teams: true,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });
        return NextResponse.json(events, { status: 200 });
    } catch (error) {
        console.error('Failed to fetch judge events:', error);
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }
} 