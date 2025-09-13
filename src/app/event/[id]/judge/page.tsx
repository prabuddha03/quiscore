import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Event, Team, Round, Judge, Criteria, Score, Participant, Participation } from "@prisma/client";
import { JudgeScoringPanel } from "@/components/event/JudgeScoringPanel";

type RoundWithCriteria = Round & { 
    criteria: (Criteria & { scores: Score[] })[] 
};
type TeamWithParticipations = Team & { 
  participations?: (Participation & { participant: Participant })[];
};
type EventForJudging = Event & {
  teams: TeamWithParticipations[];
  rounds: RoundWithCriteria[];
  judges: Judge[];
};

async function getEventForJudging(eventId: string): Promise<EventForJudging | null> {
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
      },
      rounds: {
        include: {
          criteria: {
            include: {
                scores: true,
            }
          },
        },
      },
      judges: true,
    },
  });
  return event as EventForJudging | null;
}

export default async function JudgePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/api/auth/signin");
  }

  const { id } = await params;
  const event = await getEventForJudging(id);

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Event not found.
      </div>
    );
  }

  const isJudge = event.judges.some(
    (judge) => judge.email === session.user?.email
  );
  
  const currentUserJudge = event.judges.find(j => j.email === session.user?.email);

  if (!isJudge || !currentUserJudge) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p className="mt-2 text-gray-400">
          You are not registered as a judge for this event.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
            <h1 className="text-4xl font-bold">{event.name} - Judge Panel</h1>
            <p className="text-gray-400">Welcome, {session.user.name}. Please submit your scores below.</p>
        </div>
        
        <JudgeScoringPanel event={event} judgeId={currentUserJudge.id} />
      </div>
    </div>
  );
} 