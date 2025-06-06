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
import { RoundScoreModal } from "@/components/RoundScoreModal";
import { motion } from 'framer-motion';
import { ArrowUpDown, Share2, QrCode } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { QRCodeModal } from "@/components/QRCodeModal";

// Types
type QuestionWithScores = Question & { scores: Score[] };
type RoundWithQuestions = Round & { questions: QuestionWithScores[] };
type TeamWithScores = Team & { scores: Score[] };
type EventWithRelations = Event & {
  teams: TeamWithScores[];
  rounds: RoundWithQuestions[];
};

// Main Component
export default function EventAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [event, setEvent] = useState<EventWithRelations | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [openAccordionId, setOpenAccordionId] = useState<string>();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [scoreboardUrl, setScoreboardUrl] = useState('');
  const { socket, isConnected } = useSocket(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setScoreboardUrl(`${window.location.origin}/event/${id}/scoreboard`);
    }
  }, [id]);

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
    if (event?.rounds && event.rounds.length > 0) {
      // When a new round is added, its length will change, triggering this effect.
      // We assume the last round in the array is the newest one.
      const lastRoundId = event.rounds[event.rounds.length - 1]?.id;
      setOpenAccordionId(lastRoundId);
    }
  }, [event?.rounds.length]); // Only re-run when the number of rounds changes

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit("join-room", `event_${id}`);
      
      socket.on("score-updated", () => {
        console.log("Score updated via socket");
        fetchEvent();
      });

      return () => {
        socket.off("score-updated");
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

  const handleSortChange = () => {
    const newSortOrder = sortOrder === "desc" ? "asc" : "desc";
    setSortOrder(newSortOrder);
    
    if (socket && isConnected) {
      socket.emit("sort-order-changed", { eventId: id, sortOrder: newSortOrder });
      console.log(`Emitted sort-order-changed: ${newSortOrder} for event ${id}`);
    }
  };

  const handleShare = async () => {
    if (!scoreboardUrl) return;
    try {
      await navigator.clipboard.writeText(scoreboardUrl);
      toast.success("Public scoreboard link copied to clipboard!");
    } catch (error) {
      toast.info(`Public scoreboard link: ${scoreboardUrl}`);
    }
  };

  if (!event) {
    return <div className="flex items-center justify-center min-h-screen bg-black text-white">Loading...</div>;
  }

  return (
    <>
      <div className="bg-black min-h-screen">
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white">{event.name}</h1>
              <p className="text-gray-400">Manage your event details, rounds, and scoring.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                  <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                      {isConnected ? "Live" : "Connecting..."}
                  </span>
              </div>
              <Button onClick={handleShare} variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white">
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button onClick={() => setQrModalOpen(true)} variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white">
                <QrCode className="h-4 w-4 mr-2" /> QR Code
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Scoreboard */}
            <div className="lg:col-span-2 space-y-8">
               <Card className="bg-gray-900/50 border-white/10">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">Live Scoreboard</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSortChange}
                      className="flex items-center gap-2 text-gray-400 hover:text-white"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      Sort
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      layout 
                      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                    >
                      {sortedTeams.map((team, index) => (
                        <motion.div layout key={team.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                          <Card className="bg-gray-800/60 border-white/10 text-white">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                              <CardTitle className="text-lg font-medium">{team.name}</CardTitle>
                               <Badge className={`bg-gray-700 text-gray-300 border-0 ${index === 0 ? 'bg-orange-500 text-black' : ''}`}>#{index + 1}</Badge>
                            </CardHeader>
                            <CardContent>
                              <p className="text-4xl font-bold text-center text-orange-400">
                                {calculateTotalScore(team.scores)}
                              </p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>
                  </CardContent>
                </Card>
            </div>

            {/* Right Column: Management */}
            <div className="space-y-8">
              <Card className="bg-gray-900/50 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Event Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">Rounds</h3>
                    <RoundForm eventId={event.id} onRoundCreated={fetchEvent} />
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
                          <div className="flex items-center justify-between w-full">
                            <h4 className="text-md font-semibold text-gray-200">{round.name}</h4>
                             <RoundScoreModal 
                                roundId={round.id}
                                roundName={round.name}
                                teams={event.teams}
                              />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                          {round.questions.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm text-gray-400">
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
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Teams</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="flex flex-wrap gap-2">
                    {event.teams.map((team) => (
                      <Badge key={team.id} variant="secondary" className="bg-gray-700 text-gray-300 text-sm py-1 px-3">
                        {team.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
      <QRCodeModal
        url={scoreboardUrl}
        title={event.name}
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
      />
    </>
  );
} 