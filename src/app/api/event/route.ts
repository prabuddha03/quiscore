import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

interface TeamData {
    team_name: string;
    document_link?: string;
    leader_name?: string;
    leader_contact?: string;
    [key: string]: string | undefined;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, type, teams, subType, teamsData } = await req.json();

  if (!name || !type) {
    return NextResponse.json({ error: "Missing required fields: name and type" }, { status: 400 });
  }
  
  if (type === 'QUIZ' && (teams === undefined || teams < 0)) {
    return NextResponse.json({ error: "Missing or invalid number of teams for quiz" }, { status: 400 });
  }
  
  if (type === 'GENERAL' && !subType) {
    return NextResponse.json({ error: "Missing scoring sub-type for general event" }, { status: 400 });
  }

  // Validate team count limits
  const actualTeamCount = teamsData && teamsData.length > 0 ? teamsData.length : teams;
  if (actualTeamCount < 2) {
    return NextResponse.json({ error: "At least 2 teams are required to create an event." }, { status: 400 });
  }
  
  if ((type === 'QUIZ' && teams > 100) || (type === 'GENERAL' && ((teamsData && teamsData.length > 100) || (teams && teams > 100)))) {
    return NextResponse.json({ error: "Maximum of 100 teams is allowed." }, { status: 400 });
  }

  try {
    let user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        },
      });
    }

    if (user.category === "FREE") {
      const eventCount = await prisma.event.count({
        where: { createdBy: user.id },
      });

      if (eventCount >= 2) {
        return NextResponse.json(
          {
            error:
              "Free users can create a maximum of 2 events. Please upgrade to premium for unlimited events.",
          },
          { status: 403 },
        );
      }
    }

    const eventData: Prisma.EventCreateInput = {
      name,
      type,
      createdByUser: { connect: { id: user.id } },
      allowedEditors: [session.user.email],
    };

    if (type === 'QUIZ') {
      eventData.teams = {
        create: Array.from({ length: teams }, (_, i) => ({
          name: `Team ${i + 1}`,
        })),
      };
    } else if (type === 'GENERAL') {
      eventData.subType = subType;

      if (teamsData && teamsData.length > 0) {
        eventData.teams = {
          create: teamsData.map((team: TeamData) => {
            const players: { name: string }[] = [];
            // Aggregate all member columns into a players array
            Object.keys(team).forEach(key => {
              if (key.startsWith('member_') && team[key]) {
                players.push({ name: team[key]! });
              }
            });

            return {
              name: team.team_name,
              documentLink: team.document_link || null,
              players: {
                members: players,
                leader: (team.leader_name || team.leader_contact) ? { name: team.leader_name, contact: team.leader_contact } : undefined
              },
            };
          })
        };
      } else if (teams > 0) {
        eventData.teams = {
          create: Array.from({ length: teams }, (_, i) => ({
            name: `Participant ${i + 1}`,
          })),
        };
      }
    }

    const event = await prisma.event.create({
      data: eventData,
      include: {
        teams: true,
      }
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Event creation error:', error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export async function GET() {
  const events = await prisma.event.findMany({
    include: {
      teams: true,
      createdByUser: true,
    }
  });
  return NextResponse.json(events);
} 