import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { EventType } from "@prisma/client";

// CORS configuration for external API
const allowedOrigins = [
  'http://localhost:3000',
  'https://rallyo.arbitrat.org'
];

function getCorsHeaders(origin?: string | null) {
  const isOriginAllowed = origin && allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isOriginAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface ParticipantData {
  name: string;
  email?: string;
  phone: string;
  external_id: string;
}

interface TeamData {
  team_name: string;
  participants: ParticipantData[];
}

interface ExternalEventRequest {
  teams: TeamData[];
  event_name: string;
  event_type: "QUIZ" | "GENERAL";
}

interface ExternalEventResponse {
  success: boolean;
  event_id: string;
  message: string;
  event_details: {
    name: string;
    type: string;
    teams_created: number;
    participants_created: number;
    new_participants: number;
    existing_participants_reused: number;
  };
}

// POST /api/external/events - Create event with participants from external system
// Helper function to find or create participant with deduplication
async function findOrCreateParticipant(participantData: ParticipantData) {
  // First, try to find by phone (most unique identifier)
  let participant = await prisma.participant.findFirst({
    where: { phone: participantData.phone.trim() }
  });

  if (participant) {
    // Update existing participant with latest information
    participant = await prisma.participant.update({
      where: { id: participant.id },
      data: {
        name: participantData.name.trim(),
        email: participantData.email?.trim() || participant.email,
        phone: participantData.phone.trim()
      }
    });
    console.log(`Found and updated existing participant: ${participant.name} (ID: ${participant.id})`);
    return { participant, isNew: false };
  }

  // If not found by phone, try by email (if provided)
  if (participantData.email) {
    participant = await prisma.participant.findFirst({
      where: { email: participantData.email.trim() }
    });

    if (participant) {
      // Update existing participant with latest information
      participant = await prisma.participant.update({
        where: { id: participant.id },
        data: {
          name: participantData.name.trim(),
          email: participantData.email.trim(),
          phone: participantData.phone.trim()
        }
      });
      console.log(`Found existing participant by email and updated: ${participant.name} (ID: ${participant.id})`);
      return { participant, isNew: false };
    }
  }

  // Create new participant if not found
  participant = await prisma.participant.create({
    data: {
      name: participantData.name.trim(),
      email: participantData.email?.trim() || null,
      phone: participantData.phone.trim()
    }
  });
  console.log(`Created new participant: ${participant.name} (ID: ${participant.id})`);
  return { participant, isNew: true };
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    const body: ExternalEventRequest = await req.json();
    const { teams, event_name, event_type } = body;

    // Validation
    if (!teams || !Array.isArray(teams) || teams.length === 0) {
      return NextResponse.json({
        success: false,
        error: "teams array is required and cannot be empty"
      }, { 
        status: 400,
        headers: corsHeaders
      });
    }

    if (!event_name || event_name.trim() === "") {
      return NextResponse.json({
        success: false,
        error: "event_name is required"
      }, { 
        status: 400,
        headers: corsHeaders
      });
    }

    if (!event_type || !["QUIZ", "GENERAL"].includes(event_type)) {
      return NextResponse.json({
        success: false,
        error: "event_type must be either 'QUIZ' or 'GENERAL'"
      }, { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate team data
    let totalParticipants = 0;
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      
      if (!team.team_name || team.team_name.trim() === "") {
        return NextResponse.json({
          success: false,
          error: `Team ${i + 1}: team_name is required`
        }, { 
          status: 400,
          headers: corsHeaders
        });
      }

      if (!team.participants || !Array.isArray(team.participants) || team.participants.length === 0) {
        return NextResponse.json({
          success: false,
          error: `Team ${i + 1} (${team.team_name}): participants array is required and cannot be empty`
        }, { 
          status: 400,
          headers: corsHeaders
        });
      }

      // Validate each participant in the team
      for (let j = 0; j < team.participants.length; j++) {
        const participant = team.participants[j];
        
        if (!participant.name || participant.name.trim() === "") {
          return NextResponse.json({
            success: false,
            error: `Team ${i + 1} (${team.team_name}), Participant ${j + 1}: name is required`
          }, { 
            status: 400,
            headers: corsHeaders
          });
        }
        
        if (!participant.phone || participant.phone.trim() === "") {
          return NextResponse.json({
            success: false,
            error: `Team ${i + 1} (${team.team_name}), Participant ${j + 1}: phone is required`
          }, { 
            status: 400,
            headers: corsHeaders
          });
        }
        
        if (!participant.external_id || participant.external_id.trim() === "") {
          return NextResponse.json({
            success: false,
            error: `Team ${i + 1} (${team.team_name}), Participant ${j + 1}: external_id is required`
          }, { 
            status: 400,
            headers: corsHeaders
          });
        }
      }

      totalParticipants += team.participants.length;
    }

    // Create a default admin user for external events if not exists
    let adminUser = await prisma.user.findFirst({
      where: { email: "external-admin@scorops.com" }
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: "external-admin@scorops.com",
          name: "External API Admin",
          category: "ADMIN"
        }
      });
    }

    // Create the event
    const event = await prisma.event.create({
      data: {
        name: event_name.trim(),
        type: event_type as EventType,
        createdBy: adminUser.id,
        allowedEditors: ["external-admin@scorops.com"]
      }
    });

    console.log(`Created event: ${event.name} (ID: ${event.id})`);

    // Create teams with participants
    const createdTeams = [];
    let newParticipantsCount = 0;
    let existingParticipantsCount = 0;

    for (const teamData of teams) {
      const team = await prisma.team.create({
        data: {
          name: teamData.team_name.trim(),
          eventId: event.id
        }
      });

      console.log(`Created team: ${team.name} (ID: ${team.id})`);

      // Create participants and participations for this team
      for (const participantData of teamData.participants) {
        // Find or create participant with deduplication
        const { participant, isNew } = await findOrCreateParticipant(participantData);
        
        if (isNew) {
          newParticipantsCount++;
        } else {
          existingParticipantsCount++;
        }

        // Create participation with base score of 50 and external_id
        const participation = await prisma.participation.create({
          data: {
            participantId: participant.id,
            teamId: team.id,
            eventId: event.id,
            externalId: participantData.external_id.trim(),
            score: 50 // Base score starts at 50
          }
        });

        console.log(`Created participation: Participant ${participant.id} in Team ${team.id} for Event ${event.id} with external_id ${participantData.external_id} (Participation ID: ${participation.id})`);
      }

      createdTeams.push(team);
    }

    const response: ExternalEventResponse = {
      success: true,
      event_id: event.id,
      message: "Event created successfully with participants",
      event_details: {
        name: event.name,
        type: event.type,
        teams_created: createdTeams.length,
        participants_created: totalParticipants,
        new_participants: newParticipantsCount,
        existing_participants_reused: existingParticipantsCount
      }
    };

    console.log(`External event creation completed:`, response);

    return NextResponse.json(response, { 
      status: 201,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('External event creation error:', error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    return NextResponse.json({
      success: false,
      error: "Failed to create event",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { 
      status: 500,
      headers: corsHeaders
    });
  }
}

// GET /api/external/events - Get event details by ID (for external systems)
export async function GET(req: Request) {
  try {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    const url = new URL(req.url);
    const eventId = url.searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json({
        success: false,
        error: "event_id parameter is required"
      }, { 
        status: 400,
        headers: corsHeaders
      });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        teams: {
          include: {
            participations: {
              include: {
                participant: true
              }
            }
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({
        success: false,
        error: "Event not found"
      }, { 
        status: 404,
        headers: corsHeaders
      });
    }

    // Format response for external consumption
    const formattedTeams = event.teams.map(team => ({
      team_id: team.id,
      team_name: team.name,
      participants: team.participations?.map(participation => ({
        participant_id: participation.participant?.id,
        name: participation.participant?.name,
        email: participation.participant?.email,
        phone: participation.participant?.phone,
        external_id: participation.externalId,
        current_score: participation.score,
        team_rank: participation.teamRank
      })) || []
    }));

    return NextResponse.json({
      success: true,
      event: {
        event_id: event.id,
        name: event.name,
        type: event.type,
        created_at: event.createdAt,
        teams: formattedTeams
      }
    }, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error fetching external event:', error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    return NextResponse.json({
      success: false,
      error: "Failed to fetch event"
    }, { 
      status: 500,
      headers: corsHeaders
    });
  }
}

// OPTIONS method for CORS preflight requests
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
