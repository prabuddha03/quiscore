"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from "recharts";
import { Event, Team, Score, Round, Question } from "@prisma/client";

type TeamWithScores = Team & { scores: Score[] };
type EventWithRelations = Event & {
  teams: TeamWithScores[];
  rounds: (Round & { questions: Question[] })[];
};

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTeam: TeamWithScores;
  event: EventWithRelations;
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658"];

export const ComparisonModal = ({
  isOpen,
  onClose,
  targetTeam,
  event,
}: ComparisonModalProps) => {
  const [comparedTeamIds, setComparedTeamIds] = useState<string[]>([]);
  const otherTeams = event.teams.filter((t) => t.id !== targetTeam.id);

  const handleSelection = (teamId: string, slot: number) => {
    setComparedTeamIds((prev) => {
      const newIds = [...prev];
      newIds[slot] = teamId;
      return newIds.filter(Boolean);
    });
  };

  const allQuestions = useMemo(() => {
    return event.rounds.flatMap((round, roundIndex) =>
      (round.questions || [])
        .sort((a, b) => a.number - b.number)
        .map(q => ({ ...q, roundName: round.name, roundIndex: roundIndex + 1 }))
    );
  }, [event.rounds]);

  const chartData = useMemo(() => {
    const teamsToChart = [targetTeam, ...comparedTeamIds.map(id => event.teams.find(t => t.id === id)).filter(Boolean) as TeamWithScores[]];
    
    const cumulativeScores: Record<string, number> = {};
    teamsToChart.forEach(t => cumulativeScores[t.id] = 0);

    if (allQuestions.length === 0) return [];

    return allQuestions.map((question) => {
      const questionDataPoint: { name: string; [key: string]: string | number } = {
        name: `R${question.roundIndex} Q${question.number}`,
      };

      teamsToChart.forEach(team => {
        const scoreForQuestion = team.scores.find(s => s.questionId === question.id);
        const points = scoreForQuestion ? scoreForQuestion.points : 0;
        cumulativeScores[team.id] += points;
        questionDataPoint[team.name] = cumulativeScores[team.id];
      });

      return questionDataPoint;
    });
  }, [targetTeam, comparedTeamIds, event, allQuestions]);

  const teamsInChart = useMemo(() => {
      return [targetTeam, ...comparedTeamIds.map(id => event.teams.find(t => t.id === id)).filter(Boolean) as TeamWithScores[]];
  }, [targetTeam, comparedTeamIds, event.teams]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Compare Team Performance</DialogTitle>
          <DialogDescription>
            Select up to two other teams to compare performance across rounds.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <Select onValueChange={(value) => handleSelection(value, 0)}>
            <SelectTrigger className="bg-gray-800 border-gray-600">
              <SelectValue placeholder="Select Team 1" />
            </SelectTrigger>
            <SelectContent>
              {otherTeams.map((team) => (
                <SelectItem key={team.id} value={team.id} disabled={comparedTeamIds.includes(team.id)}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(value) => handleSelection(value, 1)} disabled={comparedTeamIds.length === 0}>
            <SelectTrigger className="bg-gray-800 border-gray-600">
              <SelectValue placeholder="Select Team 2" />
            </SelectTrigger>
            <SelectContent>
              {otherTeams.map((team) => (
                <SelectItem key={team.id} value={team.id} disabled={comparedTeamIds.includes(team.id)}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="h-96 mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#888888"
                      tick={{ fontSize: 10 }}
                      interval={allQuestions.length > 40 ? Math.floor(allQuestions.length / 20) : 0}
                    />
                    <YAxis stroke="#888888" />
                    <Tooltip
                        contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.9)",
                        borderColor: "rgba(255, 255, 255, 0.2)",
                        }}
                    />
                    <Legend />
                    {teamsInChart.map((team, index) => (
                        <Line
                            key={team.id}
                            type="monotone"
                            dataKey={team.name}
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth={2}
                            dot={allQuestions.length < 50}
                            activeDot={{ r: 8 }}
                        />
                    ))}
                    {allQuestions.length > 40 && (
                      <Brush dataKey="name" height={30} stroke={COLORS[0]} />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 