"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Team, Round, Criteria, Score, Prisma } from "@prisma/client";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";

type RoundWithCriteriaAndScores = Round & { 
    criteria: (Criteria & { scores: Score[] })[] 
};
type TeamWithPlayers = Omit<Team, 'players'> & { players: Prisma.JsonValue };

interface TeamScoreFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamWithPlayers;
  round: RoundWithCriteriaAndScores;
  judgeId: string;
  eventId: string;
}

type ScoreInput = {
    points: number;
    pointers: string;
};

export function TeamScoreFormModal({ isOpen, onClose, team, round, judgeId }: TeamScoreFormModalProps) {
  const [scores, setScores] = useState<{ [criteriaId: string]: ScoreInput }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pre-fill scores if they already exist for this judge
    const existingScores: { [criteriaId: string]: ScoreInput } = {};
    round.criteria.forEach(criterion => {
        criterion.scores.forEach(score => {
            if (score.teamId === team.id && score.judgeId === judgeId && score.criteriaId) {
                existingScores[score.criteriaId] = {
                    points: score.points,
                    pointers: score.pointers || '',
                };
            }
        });
    });
    setScores(existingScores);
  }, [isOpen, team, round, judgeId]);

  const handleScoreChange = (criteriaId: string, value: string, maxPoints?: number | null) => {
    let points = parseInt(value, 10);
    if (isNaN(points)) points = 0;
    if (maxPoints != null && points > maxPoints) {
        points = maxPoints;
        toast.info(`Score cannot exceed ${maxPoints}.`);
    }
    setScores(prev => ({
      ...prev,
      [criteriaId]: { ...prev[criteriaId], points },
    }));
  };

  const handlePointersChange = (criteriaId: string, value: string) => {
    setScores(prev => ({
        ...prev,
        [criteriaId]: { ...prev[criteriaId], pointers: value }
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    const scoresPayload = Object.entries(scores).map(([criteriaId, scoreInput]) => ({
      criteriaId,
      points: scoreInput.points,
      pointers: scoreInput.pointers,
    }));
    
    try {
      const res = await fetch('/api/judge/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            teamId: team.id, 
            roundId: round.id, 
            judgeId, 
            scores: scoresPayload 
        }),
      });

      if (!res.ok) throw new Error('Failed to save scores.');
      
      toast.success(`Scores for ${team.name} saved successfully!`);
      // TODO: Add a way to refresh the event data on the parent page
      onClose();

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const playersData = team.players as { members?: { name: string }[], leader?: { name: string } };
  const teamMembers = playersData?.members?.map((m) => m.name) || [];
  const teamLeader = playersData?.leader?.name || 'N/A';


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Score: {team.name}</DialogTitle>
          <DialogDescription>Round: {round.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <h4 className="font-semibold">Team Details</h4>
                <p><span className="font-medium text-gray-400">Leader:</span> {teamLeader}</p>
                <div className="flex flex-wrap gap-2">
                    <span className="font-medium text-gray-400">Members:</span>
                    {teamMembers.map((name: string) => <Badge key={name} variant="secondary">{name}</Badge>)}
                </div>
                 {team.documentLink && (
                    <a href={team.documentLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">
                        View Document
                    </a>
                )}
            </div>

            <div className="border-t border-gray-700 my-4"></div>

            <div className="space-y-4">
                <h4 className="font-semibold">Scoring Criteria</h4>
                {round.criteria.map((criterion) => (
                    <div key={criterion.id} className="space-y-2 border-t border-gray-800 pt-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor={`score-${criterion.id}`} className="col-span-3">{criterion.name}</Label>
                            <Input
                            id={`score-${criterion.id}`}
                            type="number"
                            placeholder="Points"
                            value={scores[criterion.id]?.points ?? ''}
                            onChange={(e) => handleScoreChange(criterion.id, e.target.value, criterion.maxPoints)}
                            className="col-span-1 bg-gray-800 border-gray-600"
                            max={criterion.maxPoints ?? undefined}
                            />
                        </div>
                        <Textarea
                            id={`pointers-${criterion.id}`}
                            placeholder="Pointers (optional notes...)"
                            value={scores[criterion.id]?.pointers || ''}
                            onChange={(e) => handlePointersChange(criterion.id, e.target.value)}
                            className="bg-gray-800 border-gray-600"
                            rows={2}
                        />
                    </div>
                ))}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Scores"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 