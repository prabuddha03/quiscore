"use client";

import { use, useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Event, Team, Score, Round, Question } from "@prisma/client";
// Keep Socket.IO import but don't use it - as requested by user
// import { useSocket } from "@/hooks/use-socket";
import { motion, AnimatePresence } from "framer-motion";
import { Medal, RefreshCw, Wifi, WifiOff, Clock } from "lucide-react";
import { RoundScoreModal } from "@/components/RoundScoreModal";
import { useScoreboardSSE } from "@/hooks/use-scoreboard-sse";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  
  // SSE hook for real-time scoreboard data
  const {
    scoreboard,
    isConnected,
    isLoading,
    error,
    lastUpdateTime,
    refresh,
  } = useScoreboardSSE({ eventId: id });

  // Keep Socket.IO code but don't use it - as requested by user
  // const { socket, isConnected } = useSocket(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/event/${id}`);
    if (res.ok) {
      const data = await res.json();
      setEvent(data);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // Socket.IO logic commented out but kept - as requested by user
  /*
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
  }, [socket, isConnected, id, fetchEvent]);
  */

  const calculateTotalScore = (scores: Score[] | undefined) => {
    if (!scores || scores.length === 0) return 0;
    return scores.reduce((total, score) => total + score.points, 0);
  };

  // Use SSE data if available, otherwise fall back to REST API data
  const teamsToDisplay = scoreboard?.teams || (event?.teams || []);
  const sortedTeams = [...teamsToDisplay].sort((a, b) => {
    // Use type guard to properly handle the union type
    const scoreA = 'totalScore' in a ? a.totalScore : calculateTotalScore(a.scores);
    const scoreB = 'totalScore' in b ? b.totalScore : calculateTotalScore(b.scores);
    return scoreB - scoreA; // Always descending
  });

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return "Never";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading Scoreboard...
      </div>
    );
  }

  const getPodiumClass = (index: number) => {
    switch (index) {
      case 0: return "border-yellow-400 bg-yellow-400/10";
      case 1: return "border-slate-400 bg-slate-400/10";
      case 2: return "border-orange-700 bg-orange-700/10";
      default: return "border-white/10 bg-gray-900/50";
    }
  };

  const getMedal = (index: number) => {
    if (index === 0) return <Medal className="h-5 w-5 text-yellow-400" />;
    if (index === 1) return <Medal className="h-5 w-5 text-slate-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-700" />;
    return null;
  };

  const getScoreColor = (index: number) => {
    if (index === 0) return "text-yellow-400";
    if (index === 1) return "text-slate-400";
    if (index === 2) return "text-orange-700";
    return "text-white";
  }

  const getTeamScore = (team: TeamWithScores | { totalScore: number }) => {
    return 'totalScore' in team ? team.totalScore : calculateTotalScore(team.scores);
  };

  return (
    <div className="bg-black min-h-screen text-white">
      <div className="container mx-auto py-8 px-4">
        {/* Header with Connection Status */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">{event.name}</h1>
          <p className="text-lg text-gray-400">Live Scoreboard</p>
          
          {/* Connection Status & Controls */}
          <div className="flex items-center justify-center gap-6 mt-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                {isConnected ? "🟢 Live" : "🔴 Disconnected"}
              </Badge>
            </div>

            {/* Last Update Time */}
            {lastUpdateTime && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {formatLastUpdate(lastUpdateTime)}
              </div>
            )}

            {/* Manual Refresh Button */}
            <Button
              onClick={refresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-2 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Main Scoreboard (Visual Display) */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {sortedTeams.map((team, index) => (
              <TooltipProvider key={team.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={`/event/${id}/scoreboard/${team.id}`} passHref>
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className={`p-1 rounded-lg ${getPodiumClass(index)} h-full cursor-pointer hover:scale-105 transform-gpu`}
                      >
                        <Card className="bg-transparent border-0 text-white h-full">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xl font-medium">
                              {team.name}
                            </CardTitle>
                            {getMedal(index)}
                          </CardHeader>
                          <CardContent className="text-center">
                            <motion.p
                              key={getTeamScore(team)} // Re-animate when score changes
                              initial={{ scale: 1.2, color: "#f59e0b" }}
                              animate={{ scale: 1, color: getScoreColor(index) }}
                              transition={{ duration: 0.5 }}
                              className={`text-6xl font-bold ${getScoreColor(index)}`}
                            >
                              {getTeamScore(team)}
                            </motion.p>
                            <Badge className="mt-2 bg-gray-700 text-gray-300 border-0">
                              Rank #{index + 1}
                            </Badge>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click for analysis</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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