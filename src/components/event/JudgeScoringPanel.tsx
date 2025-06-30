"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Event, Team, Round, Judge, Criteria, Score, Prisma } from "@prisma/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { TeamScoreFormModal } from "./TeamScoreFormModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { useSocket } from "@/hooks/use-socket";
import Fuse from "fuse.js";
import { Input } from "@/components/ui/input";

type RoundWithCriteriaAndScores = Round & { 
    criteria: (Criteria & { scores: Score[] })[] 
};
type TeamWithPlayers = Omit<Team, 'players'> & { players: Prisma.JsonValue };
type EventForJudging = Event & {
  teams: TeamWithPlayers[];
  rounds: RoundWithCriteriaAndScores[];
  judges: Judge[];
};

interface JudgeScoringPanelProps {
  event: EventForJudging;
  judgeId: string;
}

export function JudgeScoringPanel({ event, judgeId }: JudgeScoringPanelProps) {
  const [openAccordionId, setOpenAccordionId] = useState<string | undefined>(event.rounds[0]?.id);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithPlayers | null>(null);
  const [selectedRound, setSelectedRound] = useState<RoundWithCriteriaAndScores | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { socket, isConnected } = useSocket(
    (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + "?path=/api/socket/io"
  );

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit("join-room", `event_${event.id}`);
      
      const handleScoreUpdate = () => {
        console.log("Score update received via socket, refreshing judge panel...");
        router.refresh();
      };
      
      socket.on("score-updated", handleScoreUpdate);

      return () => {
        socket.off("score-updated", handleScoreUpdate);
        socket.emit("leave-room", `event_${event.id}`);
      };
    }
  }, [socket, isConnected, event.id, router]);

  const fuse = useMemo(() => new Fuse(event.teams, {
    keys: ['name'],
    includeScore: true,
    threshold: 0.3,
  }), [event.teams]);

  const filteredTeams = searchQuery
    ? fuse.search(searchQuery).map(result => result.item)
    : event.teams;

  const handleOpenModal = (team: TeamWithPlayers, round: RoundWithCriteriaAndScores) => {
    setSelectedTeam(team);
    setSelectedRound(round);
  };

  const handleCloseModalAndRefresh = () => {
    setSelectedTeam(null);
    setSelectedRound(null);
    router.refresh();
  };

    const calculateTotalScoreForTeam = (teamId: string) => {
        return event.rounds.reduce((total, round) => {
            return total + round.criteria.reduce((roundTotal, criterion) => {
                return roundTotal + criterion.scores.reduce((criteriaTotal, score) => {
                    if (score.teamId === teamId) {
                        return criteriaTotal + score.points;
                    }
                    return criteriaTotal;
                }, 0)
            }, 0);
        }, 0);
    };

    const sortedTeams = [...event.teams].sort((a, b) => {
        const scoreA = calculateTotalScoreForTeam(a.id);
        const scoreB = calculateTotalScoreForTeam(b.id);
        return scoreB - scoreA;
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
            <Card className="bg-gray-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Live Scoreboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <motion.div layout className="space-y-2">
                        {sortedTeams.map((team) => (
                             <motion.div layout key={team.id}>
                                <div key={team.id} className="flex justify-between items-center p-3 bg-gray-800/60 rounded-lg">
                                    <p className="font-medium">{team.name}</p>
                                    <p className="text-xl font-bold text-orange-400">{calculateTotalScoreForTeam(team.id)}</p>
                                </div>
                             </motion.div>
                        ))}
                    </motion.div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card className="bg-gray-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Scoring Panel</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="mb-4">
                        <Input
                            placeholder="Search teams..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-gray-800 border-gray-600"
                        />
                     </div>
                     <Accordion
                        type="single"
                        collapsible
                        className="w-full space-y-4"
                        value={openAccordionId}
                        onValueChange={setOpenAccordionId}
                    >
                        {event.rounds.map((round) => (
                        <AccordionItem key={round.id} value={round.id} className="bg-gray-800/50 rounded-lg border-none">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                <h4 className="text-md font-semibold text-gray-200">{round.name}</h4>
                            </AccordionTrigger>
                            <AccordionContent className="p-4">
                               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredTeams.map((team) => (
                                        <Button key={team.id} variant="outline" onClick={() => handleOpenModal(team, round)}>
                                            {team.name}
                                        </Button>
                                    ))}
                               </div>
                               {filteredTeams.length === 0 && (
                                <p className="text-center text-gray-500">No teams found for your search.</p>
                               )}
                            </AccordionContent>
                        </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
           
        </div>

        {selectedTeam && selectedRound && (
            <TeamScoreFormModal
                isOpen={!!selectedTeam}
                onClose={handleCloseModalAndRefresh}
                team={selectedTeam}
                round={selectedRound}
                judgeId={judgeId}
                eventId={event.id}
            />
        )}
    </div>
  );
} 