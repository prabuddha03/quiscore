"use client";

import { use, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Event, Round, Question, Team, Score } from "@prisma/client";
import { RoundForm } from "@/components/RoundForm";
import { QuestionInput } from "@/components/QuestionInput";
import { ArrowUpDown, Share2, Copy } from "lucide-react";

type QuestionWithScores = Question & { scores: Score[] };
type RoundWithQuestions = Round & { questions: QuestionWithScores[] };
type TeamWithScores = Team & { scores: Score[] };
type EventWithRelations = Event & {
  teams: TeamWithScores[];
  rounds: RoundWithQuestions[];
};

export default function EventAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [event, setEvent] = useState<EventWithRelations | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchEvent = async () => {
    const res = await fetch(`/api/event/${id}`);
    if (res.ok) {
      const data = await res.json();
      setEvent(data);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const calculateTotalScore = (scores: Score[] | undefined) => {
    if (!scores || scores.length === 0) {
      return 0;
    }
    return scores.reduce((total, score) => total + score.points, 0);
  };

  const sortedTeams = event?.teams.sort((a, b) => {
    const scoreA = calculateTotalScore(a.scores);
    const scoreB = calculateTotalScore(b.scores);
    return sortOrder === "desc" ? scoreB - scoreA : scoreA - scoreB;
  }) || [];

  const handleShare = async () => {
    const publicUrl = `${window.location.origin}/event/${id}/scoreboard`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      alert("Public scoreboard link copied to clipboard!");
    } catch (error) {
      alert(`Public scoreboard link: ${publicUrl}`);
    }
  };

  if (!event) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      {/* Header with Share Button */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{event.name}</CardTitle>
              <CardDescription>
                Manage your event details, rounds, and scoring.
              </CardDescription>
            </div>
            <Button onClick={handleShare} className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share Public Link
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Live Scoreboard */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Live Scoreboard</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="flex items-center gap-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              Sort {sortOrder === "desc" ? "Ascending" : "Descending"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedTeams.map((team, index) => (
              <Card key={team.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <Badge variant="secondary">#{index + 1}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-center">
                    {calculateTotalScore(team.scores)}
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    {team.scores?.length || 0} scores
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event Management */}
      <Card>
        <CardHeader>
          <CardTitle>Event Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Rounds</h3>
            <RoundForm eventId={event.id} onRoundCreated={fetchEvent} />
            {event.rounds.map((round) => (
              <div key={round.id} className="mt-6 border-t pt-4">
                <h4 className="text-md font-semibold mb-2">{round.name}</h4>
                {round.questions.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm text-muted-foreground">
                      Questions: {round.questions.map(q => q.number).join(", ")}
                    </p>
                  </div>
                )}
                <QuestionInput
                  roundId={round.id}
                  teams={event.teams}
                  eventId={event.id}
                  onQuestionAdded={fetchEvent}
                  existingQuestions={round.questions}
                />
              </div>
            ))}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Teams</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {event.teams.map((team) => (
                <Badge key={team.id} variant="outline" className="p-2 justify-center">
                  {team.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 