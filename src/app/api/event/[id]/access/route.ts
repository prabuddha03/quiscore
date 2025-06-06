/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
// Assuming you have authOptions defined somewhere, e.g., in /lib/auth
// import { authOptions } from "@/lib/auth"; 

export async function POST(
  request: Request,
  context: { params: any }
) {
  // const session = await getServerSession(authOptions);
  // if (!session?.user?.email) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const { id } = context.params;
    const body = await request.json();
    const { allowedEditors } = body;

    if (!Array.isArray(allowedEditors)) {
        return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // First, verify the user is the owner of the event
    // const event = await prisma.event.findFirst({
    //   where: {
    //     id: id,
    //     createdBy: session.user.email,
    //   },
    // });

    // if (!event) {
    //     return NextResponse.json({ error: "Event not found or you don't have permission" }, { status: 404 });
    // }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        allowedEditors: allowedEditors,
      },
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error("Failed to update event access:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 