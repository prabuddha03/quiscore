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
import { Team, Score } from "@prisma/client";
import { useState, useEffect } from "react";
import { Eye } from "lucide-react";

interface QuestionViewModalProps {
  teams: Team[];
  questionId: string;
  questionNumber: number;
}

type TeamWithScores = Team & { scores: Score[] };

interface QuestionScore extends Score {
  team: Team;
}

export function QuestionViewModal({ teams, questionId, questionNumber }: QuestionViewModalProps) {
  const [open, setOpen] = useState(false);
  const [questionScores, setQuestionScores] = useState<QuestionScore[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQuestionScores = async () => {
    if (!open) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/question/${questionId}/scores`);
      if (res.ok) {
        const data = await res.json();
        setQuestionScores(data);
      }
    } catch (error) {
      console.error("Failed to fetch question scores:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchQuestionScores();
    }
  }, [open, questionId]);

  const getScoreForTeam = (teamId: string) => {
    return questionScores.find(score => score.teamId === teamId);
  };

  const getMethodDisplay = (method: string) => {
    switch (method) {
      case 'direct':
        return 'Direct Answer';
      case 'pounce-right':
        return 'Pounce (Correct)';
      case 'pounce-wrong':
        return 'Pounce (Wrong)';
      case 'bounce':
        return 'Bounce';
      case 'custom':
        return 'Custom';
      default:
        return method;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'direct':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pounce-right':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pounce-wrong':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'bounce':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'custom':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (points: number) => {
    if (points > 0) return 'text-green-600 bg-green-50';
    if (points < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const totalTeamsAnswered = questionScores.length;
  const correctAnswers = questionScores.filter(score => score.points > 0).length;
  const wrongAnswers = questionScores.filter(score => score.points < 0).length;
  const neutralAnswers = questionScores.filter(score => score.points === 0).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Question {questionNumber} - Team Performance</DialogTitle>
          <DialogDescription>
            View how each team performed on this question
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Loading question data...</div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{totalTeamsAnswered}</div>
                <div className="text-sm text-muted-foreground">Teams Answered</div>
              </div>
              <div className="text-center p-3 border rounded-lg bg-green-50">
                <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
                <div className="text-sm text-muted-foreground">Positive Scores</div>
              </div>
              <div className="text-center p-3 border rounded-lg bg-red-50">
                <div className="text-2xl font-bold text-red-600">{wrongAnswers}</div>
                <div className="text-sm text-muted-foreground">Negative Scores</div>
              </div>
              <div className="text-center p-3 border rounded-lg bg-gray-50">
                <div className="text-2xl font-bold text-gray-600">{neutralAnswers}</div>
                <div className="text-sm text-muted-foreground">Zero Scores</div>
              </div>
            </div>

            {/* Team Performance */}
            <div className="space-y-3">
              <h4 className="font-semibold">Team Performance</h4>
              <div className="grid gap-3">
                {teams.map((team) => {
                  const score = getScoreForTeam(team.id);
                  
                  return (
                    <div 
                      key={team.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        score ? 'bg-white' : 'bg-gray-50 opacity-75'
                      }`}
                    >
                      <div className="font-medium">{team.name}</div>
                      
                      {score ? (
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="outline" 
                            className={getMethodColor(score.method)}
                          >
                            {getMethodDisplay(score.method)}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`${getScoreColor(score.points)} font-bold`}
                          >
                            {score.points > 0 ? '+' : ''}{score.points}
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          No Answer
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Method Breakdown */}
            {totalTeamsAnswered > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Method Breakdown</h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(
                    questionScores.reduce((acc, score) => {
                      acc[score.method] = (acc[score.method] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([method, count]) => (
                    <div key={method} className="flex items-center justify-between p-3 border rounded-lg">
                      <Badge 
                        variant="outline" 
                        className={getMethodColor(method)}
                      >
                        {getMethodDisplay(method)}
                      </Badge>
                      <span className="font-medium">{count} team{count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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