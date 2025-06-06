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

  useEffect(() => {
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

    if (open) {
      fetchRoundData();
    }
  }, [open, roundId]);

  const getScoreForTeamAndQuestion = (teamId: string, questionId: string) => {
    const question = roundData?.questions.find(q => q.id === questionId);
    return question?.scores.find(score => score.teamId === teamId);
  };
  
  const getScoreDisplay = (score: Score | undefined) => {
    if (!score) return <Badge variant="outline" className="bg-gray-700/50 border-gray-600 text-gray-400">-</Badge>;
    
    let className = '';
    if (score.points > 0) className = 'bg-green-500/20 border-green-500/30 text-green-400';
    else if (score.points < 0) className = 'bg-red-500/20 border-red-500/30 text-red-400';
    else className = 'bg-gray-600/50 border-gray-500 text-gray-300';
    
    return <Badge variant="outline" className={`font-bold ${className}`}>{score.points > 0 ? '+' : ''}{score.points}</Badge>;
  };
  
  const getMethodDisplay = (method: string | undefined) => {
    if (!method) return null;
    const color = method.toLowerCase().includes('pounce') ? "text-blue-400" 
                 : method.toLowerCase().includes('bounce') ? "text-purple-400"
                 : "text-gray-400";
    return <p className={`text-xs ${color}`}>{method.charAt(0).toUpperCase()}</p>;
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

  const sortedQuestions = roundData?.questions.sort((a,b) => a.number - b.number) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-gray-400 border-gray-600 hover:bg-gray-800 hover:text-white">
          <BarChart3 className="h-4 w-4 mr-2" />
          View Scores
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] md:max-w-[90vw] h-[90vh] bg-gray-900 border-gray-700 text-white flex flex-col">
        <DialogHeader>
          <DialogTitle>{roundName} - Score Matrix</DialogTitle>
          <DialogDescription className="text-gray-400">
            A complete overview of all scores in this round.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-gray-400">Loading round data...</div>
          </div>
        ) : roundData ? (
          <div className="flex-grow overflow-auto pr-2">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-gray-900 z-20">
                <tr>
                  <th className="p-3 text-left font-semibold sticky left-0 z-10 bg-gray-900 border-b border-r border-gray-700">
                    Team
                  </th>
                  {sortedQuestions.map(question => {
                    const stats = calculateQuestionStats(question.id);
                    return (
                      <th key={question.id} className="p-3 text-center min-w-[100px] border-b border-r border-gray-700">
                        <div className="font-semibold">Q{question.number}</div>
                        <div className="text-xs text-gray-500">
                          {stats.answered}/{teams.length} | {stats.avgScore.toFixed(1)} avg
                        </div>
                      </th>
                    );
                  })}
                  <th className="p-3 text-center font-semibold sticky right-0 bg-gray-900 border-b border-l border-gray-700">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {teams.map(team => {
                  const roundTotal = calculateTeamRoundTotal(team.id);
                  let totalClassName = '';
                  if (roundTotal > 0) totalClassName = 'text-green-400';
                  else if (roundTotal < 0) totalClassName = 'text-red-400';
                  else totalClassName = 'text-gray-300';
                  
                  return (
                    <tr key={team.id}>
                      <td className="p-3 font-medium sticky left-0 bg-gray-900 z-10 border-r border-gray-700">
                        {team.name}
                      </td>
                      {sortedQuestions.map(question => {
                        const score = getScoreForTeamAndQuestion(team.id, question.id);
                        return (
                          <td key={question.id} className="p-1 text-center border-r border-gray-800">
                            <div className="flex flex-col items-center justify-center h-full">
                              {getScoreDisplay(score)}
                              {getMethodDisplay(score?.method)}
                            </div>
                          </td>
                        );
                      })}
                      <td className={`p-3 text-center font-bold sticky right-0 bg-gray-900 border-l border-gray-700 ${totalClassName}`}>
                        {roundTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
           <div className="flex-grow flex items-center justify-center">
            <div className="text-gray-400">No questions in this round yet.</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}