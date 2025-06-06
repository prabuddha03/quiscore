"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Team, Question, Score } from "@prisma/client";
import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";

interface RoundScoreModalProps {
  roundId: string;
  roundName: string;
  teams: Team[];
}

type QuestionWithScores = Question & { scores: Score[] };

interface RoundData {
  id: string;
  name: string;
  questions: QuestionWithScores[];
}

export function RoundScoreModal({ roundId, roundName, teams }: RoundScoreModalProps) {
  const [open, setOpen] = useState(false);
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRoundData = async () => {
    if (!open) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/round/${roundId}`);
      if (res.ok) {
        const data = await res.json();
        setRoundData(data);
      }
    } catch (error) {
      console.error("Failed to fetch round data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchRoundData();
    }
  }, [open, roundId]);

  const getScoreForTeamAndQuestion = (teamId: string, questionId: string) => {
    const question = roundData?.questions.find(q => q.id === questionId);
    return question?.scores.find(score => score.teamId === teamId);
  };

  const getScoreDisplay = (score: Score | undefined) => {
    if (!score) return { display: '-', className: 'bg-gray-100 text-gray-500' };
    
    if (score.points > 0) {
      return { 
        display: `+${score.points}`, 
        className: 'bg-green-100 text-green-800 border-green-200' 
      };
    } else if (score.points < 0) {
      return { 
        display: `${score.points}`, 
        className: 'bg-red-100 text-red-800 border-red-200' 
      };
    } else {
      return { 
        display: '0', 
        className: 'bg-gray-100 text-gray-600 border-gray-200' 
      };
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'direct':
        return '✓';
      case 'pounce-right':
        return '⚡';
      case 'pounce-wrong':
        return '✗';
      case 'bounce':
        return '⚪';
      case 'custom':
        return '🔧';
      default:
        return '';
    }
  };

  const calculateTeamRoundTotal = (teamId: string) => {
    let total = 0;
    roundData?.questions.forEach(question => {
      const score = question.scores.find(s => s.teamId === teamId);
      if (score) total += score.points;
    });
    return total;
  };

  const calculateQuestionStats = (questionId: string) => {
    const question = roundData?.questions.find(q => q.id === questionId);
    if (!question) return { answered: 0, avgScore: 0 };
    
    const scores = question.scores;
    const answered = scores.length;
    const avgScore = answered > 0 ? scores.reduce((sum, s) => sum + s.points, 0) / answered : 0;
    
    return { answered, avgScore };
  };

  if (!roundData && loading) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            Round Scores
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Loading round data...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <BarChart3 className="h-4 w-4" />
          Round Scores
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{roundName} - Complete Score Matrix</DialogTitle>
          <DialogDescription>
            View all team scores for every question in this round
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Loading round data...</div>
          </div>
        ) : roundData ? (
          <div className="space-y-6 py-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{roundData.questions.length}</div>
                <div className="text-sm text-muted-foreground">Questions</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{teams.length}</div>
                <div className="text-sm text-muted-foreground">Teams</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">
                  {roundData.questions.reduce((sum, q) => sum + q.scores.length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Scores</div>
              </div>
            </div>

            {/* Score Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-3 bg-gray-50 text-left font-semibold sticky left-0 z-10 bg-gray-50">
                      Team
                    </th>
                    {roundData.questions.map(question => {
                      const stats = calculateQuestionStats(question.id);
                      return (
                        <th key={question.id} className="border p-3 bg-gray-50 text-center min-w-[100px]">
                          <div className="space-y-1">
                            <div className="font-semibold">Q{question.number}</div>
                            <div className="text-xs text-muted-foreground">
                              {stats.answered}/{teams.length} answered
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Avg: {stats.avgScore.toFixed(1)}
                            </div>
                          </div>
                        </th>
                      );
                    })}
                    <th className="border p-3 bg-blue-50 text-center font-semibold">
                      Round Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map(team => {
                    const roundTotal = calculateTeamRoundTotal(team.id);
                    return (
                      <tr key={team.id}>
                        <td className="border p-3 font-medium sticky left-0 z-10 bg-white">
                          {team.name}
                        </td>
                        {roundData.questions.map(question => {
                          const score = getScoreForTeamAndQuestion(team.id, question.id);
                          const scoreDisplay = getScoreDisplay(score);
                          
                          return (
                            <td key={question.id} className="border p-1 text-center">
                              {score ? (
                                <div className="space-y-1">
                                  <Badge 
                                    variant="outline" 
                                    className={`${scoreDisplay.className} font-bold text-sm`}
                                  >
                                    {scoreDisplay.display}
                                  </Badge>
                                  <div className="text-xs text-muted-foreground">
                                    {getMethodIcon(score.method)} {score.method}
                                  </div>
                                </div>
                              ) : (
                                <Badge 
                                  variant="outline" 
                                  className="bg-gray-100 text-gray-500"
                                >
                                  -
                                </Badge>
                              )}
                            </td>
                          );
                        })}
                        <td className="border p-3 text-center bg-blue-50">
                          <Badge 
                            variant="outline" 
                            className={`font-bold text-lg ${
                              roundTotal > 0 ? 'bg-green-100 text-green-800' :
                              roundTotal < 0 ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {roundTotal > 0 ? '+' : ''}{roundTotal}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="space-y-3">
              <h4 className="font-semibold">Legend</h4>
              <div className="grid grid-cols-5 gap-3">
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span className="text-sm">Direct</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>⚡</span>
                  <span className="text-sm">Pounce Right</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✗</span>
                  <span className="text-sm">Pounce Wrong</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>⚪</span>
                  <span className="text-sm">Bounce</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🔧</span>
                  <span className="text-sm">Custom</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">+10</Badge>
                  <span className="text-sm">Positive Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-800">-5</Badge>
                  <span className="text-sm">Negative Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-gray-100 text-gray-600">0</Badge>
                  <span className="text-sm">Zero Score</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No data available for this round
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 