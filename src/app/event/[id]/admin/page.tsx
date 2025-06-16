"use client";

import { use, useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Event, Round, Question, Team, Score, Judge, Criteria, Prisma } from "@prisma/client";
import { RoundForm } from "@/components/RoundForm";
import { QuestionInput } from "@/components/QuestionInput";
import { RoundScoreModal } from "@/components/RoundScoreModal";
import { motion } from 'framer-motion';
import { ArrowUpDown, Share2, QrCode, PlusCircle, Trash2 } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { QRCodeModal } from "@/components/QRCodeModal";
import { EditRoundModal } from "@/components/EditRoundModal";
import { EditTeamModal } from "@/components/EditTeamModal";
import { JudgeManagement } from "@/components/event/JudgeManagement";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditCriteriaModal } from "@/components/EditCriteriaModal";
import { useSession } from "next-auth/react";
import { GeneralScoreMatrix } from "@/components/event/GeneralScoreMatrix";

// Types
type QuestionWithScores = Question & { scores: Score[] };
type CriteriaWithScores = Criteria & { scores: Score[] };
type RoundWithDetails = Round & { questions: QuestionWithScores[]; criteria: CriteriaWithScores[] };
type TeamWithScores = Omit<Team, 'players'> & { scores: Score[]; players: Prisma.JsonValue };
type EventWithRelations = Event & {
  teams: TeamWithScores[];
  rounds: RoundWithDetails[];
  judges: Judge[];
};

// Local CriteriaForm Component
function CriteriaForm({ roundId, eventId, onCriteriaAdded }: { roundId: string; eventId: string; onCriteriaAdded: () => void; }) {
  const [name, setName] = useState("");
  const [maxPoints, setMaxPoints] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Criteria name cannot be empty.");
      return;
    }
    setLoading(true);

    const res = await fetch(`/api/event/${eventId}/criteria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, roundId, maxPoints: Number(maxPoints) || null }),
    });

    if (res.ok) {
      toast.success("Criteria added successfully!");
      setName("");
      setMaxPoints('');
      onCriteriaAdded();
    } else {
      const { error } = await res.json();
      toast.error(`Failed to add criteria: ${error}`);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 border-t border-white/10 space-y-4">
        <h4 className="text-md font-semibold text-gray-300">Add New Criterion</h4>
        <div className="flex items-end gap-4">
            <div className="flex-grow space-y-1.5">
                <Label htmlFor="criteria-name">Criterion Name</Label>
                <Input
                    id="criteria-name"
                    placeholder="e.g., Presentation Skills"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-gray-800 border-gray-600"
                />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="max-points">Max Points</Label>
                <Input
                    id="max-points"
                    type="number"
                    placeholder="e.g., 10"
                    value={maxPoints}
                    onChange={(e) => setMaxPoints(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="bg-gray-800 border-gray-600 w-24"
                />
            </div>
            <Button type="submit" disabled={loading} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                {loading ? "Adding..." : "Add"}
            </Button>
        </div>
    </form>
  );
}

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
  const { socket, isConnected } = useSocket(
    (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + "?path=/api/socket/io"
  );
  const { data: session } = useSession();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setScoreboardUrl(`${window.location.origin}/event/${id}/scoreboard`);
    }
  }, [id]);

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/event/${id}`);
    if (res.ok) {
      const data = await res.json();
      // The players object is now passed directly.
      // The EditTeamModal will handle parsing.
      setEvent(data);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    if (event?.rounds && event.rounds.length > 0 && !openAccordionId) {
        const lastRoundId = event.rounds[event.rounds.length - 1]?.id;
        setOpenAccordionId(lastRoundId);
    }
  }, [event?.rounds, openAccordionId]);

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit("join-room", `event_${id}`);
      
      const handleScoreUpdate = () => {
        console.log("Score updated via socket, refreshing admin page...");
        fetchEvent();
      };
      
      socket.on("score-updated", handleScoreUpdate);

      return () => {
        socket.off("score-updated", handleScoreUpdate);
        socket.emit("leave-room", `event_${id}`);
      };
    }
  }, [socket, isConnected, id, fetchEvent]);

  const handleDeleteCriteria = async (criteriaId: string) => {
    if (!window.confirm("Are you sure you want to delete this criterion? This action cannot be undone.")) {
      return;
    }
    try {
        const response = await fetch(`/api/event/${event?.id}/criteria/${criteriaId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete criterion');
        }
        toast.success("Criterion deleted successfully.");
        fetchEvent(); // Re-fetch event data to update the UI
    } catch (error) {
        toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };

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
  
  const isCreator = event.createdBy === session?.user?.id;
  const isEditor = event.allowedEditors.includes(session?.user?.email || '');
  const isAuthorized = isCreator || isEditor;

  if (!isAuthorized) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-red-500">Access Denied</h1>
                <p className="mt-4 text-lg text-gray-400">You do not have permission to view this page.</p>
            </div>
        </div>
    );
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
                              <div className="flex items-center">
                                <CardTitle className="text-lg font-medium">{team.name}</CardTitle>
                                <EditTeamModal team={team} onTeamUpdated={fetchEvent} />
                              </div>
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
                    <RoundForm eventId={event.id} eventType={event.type} onRoundCreated={fetchEvent} />
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
                        <div className="flex items-center justify-between w-full px-4 py-3">
                            <AccordionTrigger className="hover:no-underline">
                                <h4 className="text-md font-semibold text-gray-200">{round.name}</h4>
                            </AccordionTrigger>
                            <div className="flex items-center gap-2" onClick={(e) => { e.stopPropagation(); }}>
                                <EditRoundModal round={round} eventType={event.type} onRoundUpdated={fetchEvent} />
                                {event.type === 'QUIZ' && 
                                  <RoundScoreModal 
                                      roundId={round.id}
                                      roundName={round.name}
                                      teams={event.teams}
                                  />
                                }
                            </div>
                        </div>
                        <AccordionContent className="p-4 pt-0">
                          {event.type === 'QUIZ' && (
                            <>
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
                            </>
                          )}
                          {event.type === 'GENERAL' && (
                            <div>
                             <h4 className="text-md font-semibold text-gray-300 mt-4 mb-2">Scoring Criteria</h4>
                             <div className="space-y-2">
                                {round.criteria.map(c => (
                                 <div key={c.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                                   <span className="text-gray-300">{c.name} {c.maxPoints && `(out of ${c.maxPoints})`}</span>
                                   <div className="flex items-center gap-2">
                                       <EditCriteriaModal criterion={c} onCriteriaUpdated={fetchEvent} eventId={event.id} />
                                       <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400" onClick={() => handleDeleteCriteria(c.id)}>
                                           <Trash2 className="h-4 w-4" />
                                       </Button>
                                   </div>
                                 </div>
                                ))}
                             </div>
                             <CriteriaForm roundId={round.id} eventId={id} onCriteriaAdded={fetchEvent} />
                             <GeneralScoreMatrix teams={event.teams} criteria={round.criteria} />
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              {(event.type === 'GENERAL' || event.subType === 'judge_based_individual') && (
                 <JudgeManagement eventId={id} judges={event.judges} onUpdate={fetchEvent} />
              )}

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