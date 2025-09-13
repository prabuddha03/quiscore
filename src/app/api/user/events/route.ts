import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userEmail = session.user.email;

    // Admin emails that can see all events
    const adminEmails = [
      'brsnprsnl@gmail.com',
      'prabuddha.chowdhury@gmail.com', 
      'pragyatheofficialquizclubuem@gmail.com',
      'dipanjandhar18@gmail.com'
    ];

    const isAdmin = adminEmails.includes(userEmail);

    let events;

    if (isAdmin) {
      // Admin users see all events
      events = await prisma.event.findMany({
        include: {
          judges: true, // Include judge details for the frontend
          createdByUser: true, // Include creator details
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      // Regular users see only events they have access to
      events = await prisma.event.findMany({
        where: {
          OR: [
            { createdBy: user.id },
            { allowedEditors: { has: userEmail } },
            { judges: { some: { email: userEmail } } },
          ],
        },
        include: {
          judges: true, // Include judge details for the frontend
          createdByUser: true, // Include creator details
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching user events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
} 