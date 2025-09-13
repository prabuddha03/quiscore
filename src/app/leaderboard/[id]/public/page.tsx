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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trophy, Medal, Award, RefreshCw, Clock, BarChart3, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";

interface EventScore {
  eventId: string;
  eventName: string;
  eventType: string;
  teamName: string;
  teamRank: number;
  score: number;
  createdAt: string;
}

interface LeaderboardParticipant {
  rank: number;
  participant: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  totalScore: number;
  eventScores: EventScore[];
}

interface PublicLeaderboard {
  id: string;
  name: string;
  eventIds: string[];
  lastUpdated: string;
  participants: LeaderboardParticipant[];
}

export default function PublicLeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [leaderboard, setLeaderboard] = useState<PublicLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<LeaderboardParticipant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`/api/leaderboard/${id}/public`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
        setLastUpdate(new Date());
      } else {
        console.error('Failed to fetch leaderboard');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing public leaderboard...');
      fetchLeaderboard();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-yellow-400 bg-yellow-400/10";
      case 2:
        return "border-gray-400 bg-gray-400/10";
      case 3:
        return "border-amber-600 bg-amber-600/10";
      default:
        return "border-gray-600 bg-gray-800/50";
    }
  };

  const prepareRadarData = (participant: LeaderboardParticipant) => {
    return participant.eventScores.map(eventScore => ({
      event: eventScore.eventName,
      score: eventScore.score,
      maxScore: 150, // Assuming max score based on ranking system
      teamRank: eventScore.teamRank
    }));
  };

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return "Never";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return `${diffHours}h ago`;
    }
  };

  const getUniqueEvents = (participants: LeaderboardParticipant[]) => {
    const eventMap = new Map();
    participants.forEach(participant => {
      participant.eventScores.forEach(eventScore => {
        if (!eventMap.has(eventScore.eventId)) {
          eventMap.set(eventScore.eventId, {
            id: eventScore.eventId,
            name: eventScore.eventName,
            type: eventScore.eventType
          });
        }
      });
    });
    return Array.from(eventMap.values());
  };

  const getParticipantEventScore = (participant: LeaderboardParticipant, eventId: string) => {
    const eventScore = participant.eventScores.find(es => es.eventId === eventId);
    return eventScore ? eventScore.score : 0;
  };

  const getParticipantTeamInfo = (participant: LeaderboardParticipant, eventId: string) => {
    const eventScore = participant.eventScores.find(es => es.eventId === eventId);
    return eventScore ? { teamName: eventScore.teamName, teamId: null } : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading Leaderboard...</p>
        </div>
      </div>
    );
  }

  if (!leaderboard) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold mb-2">Leaderboard Not Found</h1>
          <p className="text-gray-400">The requested leaderboard could not be found.</p>
        </div>
      </div>
    );
  }

  const uniqueEvents = getUniqueEvents(leaderboard.participants);

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{leaderboard.name}</h1>
              <p className="text-gray-400">Public Leaderboard • {leaderboard.participants.length} Participants</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Clock className="h-4 w-4" />
                <span>Last updated: {formatLastUpdate(lastUpdate)}</span>
              </div>
              <Badge variant="outline" className="text-green-400 border-green-400">
                Auto-refreshing every 5 minutes
              </Badge>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Leaderboard Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Participant</TableHead>
                    {uniqueEvents.map(event => (
                      <TableHead key={event.id} className="text-center min-w-32">
                        <div>
                          <div className="font-medium">{event.name}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {event.type}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-bold">Total</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {leaderboard.participants.map((participant, index) => (
                      <motion.tr
                        key={participant.participant.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={`border-gray-700 hover:bg-gray-800/50 transition-colors ${getRankColor(participant.rank)}`}
                      >
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {getRankIcon(participant.rank)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{participant.participant.name}</div>
                            <div className="text-sm text-gray-400">
                              {participant.participant.email && (
                                <span>{participant.participant.email}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {uniqueEvents.map(event => {
                          const score = getParticipantEventScore(participant, event.id);
                          const teamInfo = getParticipantTeamInfo(participant, event.id);
                          return (
                            <TableCell key={event.id} className="text-center">
                              {score > 0 ? (
                                <div>
                                  <div className="font-bold text-lg">{score}</div>
                                  {teamInfo && (
                                    <div className="text-xs text-gray-400">{teamInfo.teamName}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <div className="text-2xl font-bold text-orange-400">
                            {participant.totalScore}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog open={isModalOpen && selectedParticipant?.participant.id === participant.participant.id} onOpenChange={(open) => {
                              setIsModalOpen(open);
                              if (!open) setSelectedParticipant(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedParticipant(participant);
                                    setIsModalOpen(true);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <BarChart3 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-4xl bg-gray-900 text-white border-gray-700">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    {participant.participant.name} - Performance Analytics
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6">
                                  {/* Radar Chart */}
                                  <div className="h-96">
                                    <h3 className="text-lg font-semibold mb-4">Event Performance Radar</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <RadarChart data={prepareRadarData(participant)}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="event" />
                                        <PolarRadiusAxis angle={90} domain={[0, 150]} />
                                        <Radar
                                          name="Score"
                                          dataKey="score"
                                          stroke="#f97316"
                                          fill="#f97316"
                                          fillOpacity={0.3}
                                        />
                                        <Tooltip />
                                        <Legend />
                                      </RadarChart>
                                    </ResponsiveContainer>
                                  </div>

                                  {/* Event Details */}
                                  <div>
                                    <h3 className="text-lg font-semibold mb-4">Event Participation Details</h3>
                                    <div className="grid gap-4">
                                      {participant.eventScores.map(eventScore => (
                                        <div key={eventScore.eventId} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                          <div>
                                            <div className="font-medium">{eventScore.eventName}</div>
                                            <div className="text-sm text-gray-400">
                                              Team: {eventScore.teamName} • Rank: #{eventScore.teamRank}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className="text-right">
                                              <div className="text-xl font-bold text-orange-400">{eventScore.score}</div>
                                              <div className="text-xs text-gray-400">points</div>
                                            </div>
                                            <Link
                                              href={`/event/${eventScore.eventId}/scoreboard`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              <Button variant="outline" size="sm" className="h-8">
                                                <ExternalLink className="h-3 w-3 mr-1" />
                                                View
                                              </Button>
                                            </Link>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400">
          <p>🏆 Powered by Scorops • Updates automatically every 5 minutes</p>
        </div>
      </div>
    </div>
  );
}
