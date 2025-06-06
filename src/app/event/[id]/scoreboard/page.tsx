"use client";

import { use, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Event, Team, Score, Round, Question } from "@prisma/client";
import { useSocket } from "@/hooks/use-socket";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import { RoundScoreModal } from "@/components/RoundScoreModal";

type QuestionWithScores = Question & { scores: Score[] };
type RoundWithQuestions = Round & { questions: QuestionWithScores[] };
type TeamWithScores = Team & { scores: Score[] };
type EventWithRelations = Event & {
  teams: TeamWithScores[];
  rounds: RoundWithQuestions[];
};

export default function ScoreboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [event, setEvent] = useState<EventWithRelations | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
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
        fetchEvent();
      });

      socket.on("sort-order-changed", (data: { eventId: string; sortOrder: "asc" | "desc" }) => {
        if (data.eventId === id) {
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

  const calculateTotalScore = (scores: Score[] | undefined) => {
    if (!scores || scores.length === 0) return 0;
    return scores.reduce((total, score) => total + score.points, 0);
  };

  const sortedTeams = [...(event?.teams || [])].sort((a, b) => {
    const scoreA = calculateTotalScore(a.scores);
    const scoreB = calculateTotalScore(b.scores);
    return sortOrder === "desc" ? scoreB - scoreA : scoreA - scoreB;
  });

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading Scoreboard...
      </div>
    );
  }

  const getPodiumClass = (index: number) => {
    switch (index) {
      case 0: return "border-orange-400 bg-orange-400/10";
      case 1: return "border-gray-400 bg-gray-400/10";
      case 2: return "border-yellow-700 bg-yellow-700/10";
      default: return "border-white/10 bg-gray-900/50";
    }
  };

  return (
    <div className="bg-black min-h-screen text-white">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">{event.name}</h1>
          <p className="text-lg text-gray-400">Live Scoreboard</p>
          <div className="inline-flex items-center gap-2 text-sm font-medium mt-2">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
              {isConnected ? "Live" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Main Scoreboard */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {sortedTeams.map((team, index) => (
              <motion.div
                key={team.id}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.5, type: "spring" }}
                className={`p-1 rounded-lg ${getPodiumClass(index)}`}
              >
                <Card className="bg-transparent border-0 text-white h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xl font-medium">{team.name}</CardTitle>
                    {index < 3 && <Trophy className="h-5 w-5 text-orange-400" />}
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-6xl font-bold text-orange-400">
                      {calculateTotalScore(team.scores)}
                    </p>
                    <Badge className="mt-2 bg-gray-700 text-gray-300 border-0">Rank #{index + 1}</Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        
        {/* Rounds Overview */}
        <div className="mt-16">
           <h2 className="text-3xl font-bold text-center mb-8">Rounds Overview</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {event.rounds.map(round => (
               <Card key={round.id} className="bg-gray-900/50 border-white/10">
                 <CardHeader>
                   <CardTitle className="text-white">{round.name}</CardTitle>
                 </CardHeader>
                 <CardContent className="flex justify-between items-center">
                    <p className="text-sm text-gray-400">{round.questions.length} questions</p>
                    <RoundScoreModal 
                      roundId={round.id}
                      roundName={round.name}
                      teams={event.teams}
                    />
                 </CardContent>
               </Card>
             ))}
           </div>
        </div>

      </div>
    </div>
  );
} 