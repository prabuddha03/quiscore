"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Participant {
  id: string;
  name: string;
  email?: string;
  phone: string;
}

interface Participation {
  id: string;
  score: number;
  teamRank: number;
  team: {
    id: string;
    name: string;
  };
  event: {
    id: string;
    name: string;
  };
}

interface LeaderboardEntry {
  id: string;
  participantId: string;
  eventIds: string[];
  totalScore: number;
  participant: Participant;
  participations: Participation[];
  createdAt: string;
  updatedAt: string;
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      } else {
        toast.error('Failed to fetch leaderboard');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const calculateLeaderboard = async () => {
    setCalculating(true);
    try {
      const response = await fetch('/api/leaderboard/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recalculateAll: true })
      });
      
      if (response.ok) {
        toast.success('Leaderboard recalculated successfully');
        await fetchLeaderboard();
      } else {
        toast.error('Failed to recalculate leaderboard');
      }
    } catch (error) {
      console.error('Error calculating leaderboard:', error);
      toast.error('Failed to recalculate leaderboard');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 2:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-500">#{index + 1}</span>;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-500/20 border-yellow-500/30";
      case 1:
        return "bg-gray-400/20 border-gray-400/30";
      case 2:
        return "bg-amber-600/20 border-amber-600/30";
      default:
        return "bg-gray-800/50 border-gray-700";
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400">Loading leaderboard...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Leaderboard
          </CardTitle>
          <Button
            onClick={calculateLeaderboard}
            disabled={calculating}
            variant="outline"
            size="sm"
            className="border-gray-600 hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
            {calculating ? 'Calculating...' : 'Recalculate'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No leaderboard entries found. Create some events and participants to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className={`p-4 rounded-lg border ${getRankColor(index)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getRankIcon(index)}
                    <div>
                      <h3 className="font-semibold text-white text-lg">
                        {entry.participant.name}
                      </h3>
                      <div className="text-sm text-gray-400">
                        {entry.participant.email && (
                          <span>{entry.participant.email} • </span>
                        )}
                        {entry.participant.phone}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {entry.totalScore}
                    </div>
                    <div className="text-sm text-gray-400">Total Points</div>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-gray-300">
                    Participations ({entry.participations.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {entry.participations.map((participation) => (
                      <div
                        key={participation.id}
                        className="bg-gray-800/50 rounded p-3 border border-gray-700"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-white text-sm">
                              {participation.event.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              Team: {participation.team.name}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">
                              Rank #{participation.teamRank}
                            </Badge>
                            <div className="text-sm font-semibold text-orange-400 mt-1">
                              {participation.score} pts
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
