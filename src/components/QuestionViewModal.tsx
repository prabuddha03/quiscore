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

interface QuestionScore extends Score {
  team: Team;
}

export function QuestionViewModal({ teams, questionId, questionNumber }: QuestionViewModalProps) {
  const [open, setOpen] = useState(false);
  const [questionScores, setQuestionScores] = useState<QuestionScore[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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

    if (open) {
      fetchQuestionScores();
    }
  }, [open, questionId]);

  const getScoreForTeam = (teamId: string) => {
    return questionScores.find(score => score.teamId === teamId);
  };
  
  const getMethodDisplay = (method: string | null) => {
    if (!method) return null;
    const color = method.toLowerCase().includes('pounce') ? "bg-blue-500/20 text-blue-300" 
                 : method.toLowerCase().includes('bounce') ? "bg-purple-500/20 text-purple-300"
                 : "bg-gray-500/20 text-gray-300";
    return <Badge variant="outline" className={`border-0 ${color}`}>{method.charAt(0).toUpperCase() + method.slice(1)}</Badge>;
  };

  const getScoreDisplay = (points: number) => {
    const color = points > 0 ? 'text-green-400' : points < 0 ? 'text-red-400' : 'text-gray-400';
    return <span className={`font-bold ${color}`}>{points > 0 ? '+' : ''}{points}</span>;
  };

  const totalTeamsAnswered = questionScores.length;
  const correctAnswers = questionScores.filter(score => score.points > 0).length;
  const wrongAnswers = questionScores.filter(score => score.points < 0).length;
  const neutralAnswers = questionScores.filter(score => score.points === 0).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:bg-gray-700 hover:text-white">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Question {questionNumber} - Performance</DialogTitle>
          <DialogDescription className="text-gray-400">
            A summary of how each team performed on this question.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-400">Loading question data...</div>
          </div>
        ) : (
          <div className="space-y-8 py-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-gray-800 border border-gray-700">
                <div className="text-3xl font-bold text-white">{totalTeamsAnswered}</div>
                <div className="text-sm text-gray-400">Answered</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-900/50 border border-green-500/30">
                <div className="text-3xl font-bold text-green-400">{correctAnswers}</div>
                <div className="text-sm text-gray-400">Correct</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-900/50 border border-red-500/30">
                <div className="text-3xl font-bold text-red-400">{wrongAnswers}</div>
                <div className="text-sm text-gray-400">Incorrect</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-800 border border-gray-700">
                <div className="text-3xl font-bold text-gray-400">{neutralAnswers}</div>
                <div className="text-sm text-gray-400">Neutral</div>
              </div>
            </div>

            {/* Team Performance List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg text-gray-200">Team Performance</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 max-h-60 overflow-y-auto pr-2">
                {teams.map((team) => {
                  const score = getScoreForTeam(team.id);
                  return (
                    <div 
                      key={team.id} 
                      className={`flex items-center justify-between p-2 rounded-md ${
                        score ? 'bg-gray-800/70' : 'bg-gray-800/30 text-gray-500'
                      }`}
                    >
                      <div className="font-medium text-sm">{team.name}</div>
                      
                      {score ? (
                        <div className="flex items-center gap-3">
                          {getMethodDisplay(score.method)}
                          <div className="w-12 text-right font-mono text-base">{getScoreDisplay(score.points)}</div>
                        </div>
                      ) : (
                        <span className="text-xs">No Answer</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Method Breakdown */}
            {totalTeamsAnswered > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-lg text-gray-200">Method Breakdown</h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(
                    questionScores.reduce((acc, score) => {
                      const method = score.method || 'Unknown';
                      acc[method] = (acc[method] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([method, count]) => (
                    <div key={method} className="flex items-center justify-between p-3 bg-gray-800/70 rounded-md">
                      {getMethodDisplay(method)}
                      <span className="font-medium text-gray-300">{count} team{count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 