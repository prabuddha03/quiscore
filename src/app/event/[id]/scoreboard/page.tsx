"use client";

import { use, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Event, Team, Score } from "@prisma/client";
import { useSocket } from "@/hooks/use-socket";

type TeamWithScores = Team & { scores: Score[] };
type EventWithTeamsAndScores = Event & { teams: TeamWithScores[] };

export default function ScoreboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [event, setEvent] = useState<EventWithTeamsAndScores | null>(null);
  const socket = useSocket(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

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

  useEffect(() => {
    if (socket) {
      socket.on("connect", () => {
        console.log("connected to socket");
        socket.emit("join-room", `event_${id}`);
      });

      socket.on("score-updated", () => {
        console.log("score updated");
        fetchEvent();
      });

      return () => {
        socket.off("connect");
        socket.off("score-updated");
      };
    }
  }, [socket, id]);


  if (!event) {
    return <div>Loading...</div>;
  }

  const calculateTotalScore = (scores: Score[] | undefined) => {
    if (!scores || scores.length === 0) {
      return 0;
    }
    return scores.reduce((total, score) => total + score.points, 0);
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-4xl font-bold">
            {event.name} - Scoreboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {event.teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">
                    {calculateTotalScore(team.scores)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {team.scores?.length || 0} scores
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 