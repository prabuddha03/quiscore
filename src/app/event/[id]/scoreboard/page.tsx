"use client";

import { use, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortingAnimation, setSortingAnimation] = useState(false);
  const { socket, isConnected } = useSocket(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

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
    if (socket && isConnected) {
      socket.emit("join-room", `event_${id}`);
      
      socket.on("score-updated", () => {
        console.log("Score updated via socket");
        fetchEvent();
      });

      socket.on("sort-order-changed", (data: { eventId: string; sortOrder: "asc" | "desc" }) => {
        if (data.eventId === id) {
          console.log(`Sort order changed via socket: ${data.sortOrder}`);
          
          // Trigger sorting animation
          setSortingAnimation(true);
          setTimeout(() => setSortingAnimation(false), 1000);
          
          setSortOrder(data.sortOrder);
        }
      });

      return () => {
        socket.off("score-updated");
        socket.off("sort-order-changed");
        socket.emit("leave-room", `event_${id}`);
      };
    }
  }, [socket, isConnected, id]);

  if (!event) {
    return <div>Loading...</div>;
  }

  const calculateTotalScore = (scores: Score[] | undefined) => {
    if (!scores || scores.length === 0) {
      return 0;
    }
    return scores.reduce((total, score) => total + score.points, 0);
  };

  const sortedTeams = event.teams.sort((a, b) => {
    const scoreA = calculateTotalScore(a.scores);
    const scoreB = calculateTotalScore(b.scores);
    return sortOrder === "desc" ? scoreB - scoreA : scoreA - scoreB;
  });

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-4xl font-bold">
            {event.name} - Scoreboard
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            {isConnected ? "🟢 Connected - Real-time updates" : "🔴 Connecting..."}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            {sortingAnimation && "🔄 "}
            Sorting: {sortOrder === "desc" ? "Highest to Lowest" : "Lowest to Highest"}
            {sortingAnimation && " (Updated by Admin)"}
          </p>
        </CardHeader>
        <CardContent>
          <div 
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 ${
              sortingAnimation ? "scale-[0.98] opacity-80" : "scale-100 opacity-100"
            }`}
          >
            {sortedTeams.map((team, index) => (
              <Card 
                key={team.id} 
                className={`relative transition-all duration-300 ${
                  sortingAnimation ? "animate-pulse border-blue-200" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <Badge 
                      variant="secondary"
                      className={sortingAnimation ? "bg-blue-100 border-blue-300" : ""}
                    >
                      #{index + 1}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-center">
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
    </div>
  );
} 