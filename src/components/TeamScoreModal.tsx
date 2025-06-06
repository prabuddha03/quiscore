"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Team } from "@prisma/client";
import { useState, useEffect } from "react";
import { Plus, Minus, CheckCircle, Pencil } from "lucide-react";
import { toast } from 'sonner';

interface TeamScoreModalProps {
  teams: Team[];
  questionId: string;
  eventId: string;
  onScoreAdded?: () => void;
  roundId?: string;
  questionNumber?: number;
}

interface ExistingScore {
  id: string;
  teamId: string;
  method: string;
  points: number;
}

interface RoundRules {
  pounce: boolean;
  bounce: boolean;
  direction: string;
  scoring: {
    directRight: number;
    pounceRight: number;
    pounceWrong: number;
    bouncePoints: number;
  };
}

export function TeamScoreModal({ teams, questionId, eventId, onScoreAdded, roundId, questionNumber }: TeamScoreModalProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [roundRules, setRoundRules] = useState<RoundRules | null>(null);
  const [teamScores, setTeamScores] = useState<Record<string, number>>({});
  const [teamMethods, setTeamMethods] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const fetchRoundRules = async () => {
      if (roundId) {
        try {
          const res = await fetch(`/api/round/${roundId}`);
          if (res.ok) {
            const data = await res.json();
            setRoundRules(data.rules);
          }
        } catch (error) {
          console.error("Failed to fetch round rules:", error);
        }
      }
    };
    fetchRoundRules();
  }, [roundId]);

  useEffect(() => {
    const fetchAndInitialize = async () => {
      if (open) {
        setLoading(true);
        try {
          const res = await fetch(`/api/question/${questionId}/scores`);
          if (res.ok) {
            const scores: ExistingScore[] = await res.json();
            const defaultMethods: Record<string, string> = {};
            const existingTeamScores: Record<string, number> = {};

            teams.forEach(team => {
              const existingScore = scores.find(score => score.teamId === team.id);
              if (existingScore) {
                defaultMethods[team.id] = existingScore.method;
                existingTeamScores[team.id] = existingScore.points;
              } else {
                defaultMethods[team.id] = 'direct';
              }
            });

            setIsEditMode(scores.length > 0);
            setTeamMethods(defaultMethods);
            setTeamScores(existingTeamScores);
          }
        } catch (error) {
          console.error("Failed to fetch existing scores:", error);
        } finally {
          setLoading(false);
        }
      } else {
        // Reset state when modal is closed
        setTeamScores({});
        setTeamMethods({});
        setIsEditMode(false);
      }
    };

    fetchAndInitialize();
  }, [open, questionId, teams]);

  const handleQuickScore = (teamId: string, points: number, method: string) => {
    setTeamScores(prev => ({ ...prev, [teamId]: points }));
    setTeamMethods(prev => ({ ...prev, [teamId]: method }));
  };

  const handleMethodSelect = (teamId: string, method: string) => {
    setTeamMethods(prev => ({ ...prev, [teamId]: method }));
    
    if (roundRules?.scoring) {
      const { directRight, pounceRight, bouncePoints } = roundRules.scoring;
      let points = 0;
      
      switch (method) {
        case 'direct': points = directRight; break;
        case 'pounce': points = pounceRight; break; // Default to correct pounce
        case 'bounce': points = bouncePoints; break;
      }
      
      setTeamScores(prev => ({ ...prev, [teamId]: points }));
    }
  };

  const adjustScore = (teamId: string, delta: number) => {
    setTeamScores(prev => ({ 
      ...prev, 
      [teamId]: (prev[teamId] || 0) + delta 
    }));
  };

  const resetTeamScore = (teamId: string) => {
    setTeamScores(prev => {
      const newScores = { ...prev };
      delete newScores[teamId];
      return newScores;
    });
    setTeamMethods(prev => ({ ...prev, [teamId]: 'direct' }));
  };

  const handleShowConfirmation = () => {
    const teamIds = Object.keys(teamScores);
    if (teamIds.length === 0) {
      toast.error("Please set scores for at least one team");
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    const teamIds = Object.keys(teamScores);
    setLoading(true);
    
    try {
      const method = "PUT"; // Always use PUT with upsert
      
      const promises = teamIds.map(teamId => 
        fetch("/api/score", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId,
            questionId,
            method: teamMethods[teamId] || 'direct',
            points: teamScores[teamId],
            eventId,
          }),
        })
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every(res => res.ok);

      if (allSuccessful) {
        setShowConfirmation(false);
        setOpen(false);
        if (onScoreAdded) onScoreAdded();
        toast.success(`Scores ${isEditMode ? 'updated' : 'added'} successfully!`);
      } else {
        toast.error(`Failed to ${isEditMode ? 'update' : 'add'} some scores`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} scores:`, error);
      toast.error(`Error ${isEditMode ? 'updating' : 'adding'} scores`);
    }
    setLoading(false);
  };

  const getScoreDisplay = (teamId: string) => {
    const score = teamScores[teamId];
    if (score === undefined) return <span className="text-gray-500">-</span>;
    const color = score > 0 ? 'text-green-400' : score < 0 ? 'text-red-400' : 'text-gray-400';
    return <span className={`font-bold ${color}`}>{score}</span>;
  };
  
  const getMethodButtonStyle = (teamId: string, method: string) => {
    return teamMethods[teamId] === method 
      ? "bg-orange-500 text-white" 
      : "bg-gray-700 text-gray-300 hover:bg-gray-600";
  };
  
  const getMethodDisplay = (method: string) => {
    if (!method) return null;
    const color = method.toLowerCase().includes('pounce') ? "bg-blue-500/20 text-blue-300" 
                 : method.toLowerCase().includes('bounce') ? "bg-purple-500/20 text-purple-300"
                 : "bg-gray-500/20 text-gray-300";
    return <Badge variant="outline" className={`border-0 ${color}`}>{method.charAt(0).toUpperCase() + method.slice(1)}</Badge>;
  };
  
  const getTeamsWithChanges = () => {
    return teams.filter(team => teamScores[team.id] !== undefined);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
           <Button variant="ghost" size="sm" className="text-orange-400 hover:bg-orange-400/10 hover:text-orange-300">
             <Pencil className="h-3 w-3 mr-1" /> {isEditMode ? "Edit" : "Score"}
           </Button>
        </DialogTrigger>
        <DialogContent className="max-w-screen-2xl h-[90vh] bg-gray-900 border-gray-700 text-white flex flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{isEditMode ? 'Edit Scores' : 'Add Scores'} for Question {questionNumber}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Set scores and scoring method for each team. Unscored teams will receive 0 points.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto">
            {teams.map((team) => (
              <div key={team.id} className="p-4 rounded-lg bg-gray-800/80 border border-gray-700/60 space-y-4 flex flex-col">
                <div className="flex justify-between items-center">
                   <h4 className="font-semibold text-lg text-gray-200">{team.name}</h4>
                   <div className="text-2xl">{getScoreDisplay(team.id)}</div>
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-400">Method</p>
                    <div className="flex flex-wrap gap-2">
                       <Button size="sm" onClick={() => handleMethodSelect(team.id, 'direct')} className={getMethodButtonStyle(team.id, 'direct')}>Direct</Button>
                       {roundRules?.pounce && <Button size="sm" onClick={() => handleMethodSelect(team.id, 'pounce')} className={getMethodButtonStyle(team.id, 'pounce')}>Pounce</Button>}
                       {roundRules?.bounce && <Button size="sm" onClick={() => handleMethodSelect(team.id, 'bounce')} className={getMethodButtonStyle(team.id, 'bounce')}>Bounce</Button>}
                    </div>
                </div>
                
                <div className="space-y-2 mt-auto pt-4">
                   <p className="text-sm font-medium text-gray-400">Score</p>
                   <div className="flex items-center flex-wrap justify-between gap-2">
                       <div className="flex items-center gap-2">
                           <Button size="icon" variant="outline" className="w-8 h-8 bg-gray-700 border-gray-600 hover:bg-gray-600" onClick={() => adjustScore(team.id, -1)}><Minus className="h-4 w-4" /></Button>
                           <Button size="icon" variant="outline" className="w-8 h-8 bg-gray-700 border-gray-600 hover:bg-gray-600" onClick={() => adjustScore(team.id, 1)}><Plus className="h-4 w-4" /></Button>
                       </div>
                       {roundRules?.scoring && (
                          <div className="flex items-center gap-2">
                              {teamMethods[team.id] === 'pounce' && roundRules.pounce && (
                                <>
                                  <Button size="sm" variant="outline" className="bg-green-500/10 border-green-500/20 text-green-400 h-8" onClick={() => handleQuickScore(team.id, roundRules.scoring.pounceRight, 'pounce')}>+{roundRules.scoring.pounceRight}</Button>
                                  <Button size="sm" variant="outline" className="bg-red-500/10 border-red-500/20 text-red-400 h-8" onClick={() => handleQuickScore(team.id, roundRules.scoring.pounceWrong, 'pounce')}>{roundRules.scoring.pounceWrong}</Button>
                                </>
                              )}
                          </div>
                       )}
                       <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-400" onClick={() => resetTeamScore(team.id)}>Reset</Button>
                   </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 border-t border-gray-800">
            <Button variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleShowConfirmation} disabled={loading}>
              <CheckCircle className="h-4 w-4 mr-2"/>
              Submit Scores
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
         <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
             <DialogHeader>
                <DialogTitle>Confirm Score Submission</DialogTitle>
                <DialogDescription className="text-gray-400">
                    You are about to submit the following scores. Please review them carefully.
                </DialogDescription>
             </DialogHeader>
             <div className="my-4 max-h-[40vh] overflow-y-auto px-1 space-y-2">
                {getTeamsWithChanges().map(team => (
                    <div key={team.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-md">
                        <span className="font-semibold text-gray-200">{team.name}</span>
                        <div className="flex items-center gap-3">
                            {getMethodDisplay(teamMethods[team.id])}
                            <span className={`font-bold text-lg ${teamScores[team.id] > 0 ? 'text-green-400' : teamScores[team.id] < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                {teamScores[team.id]}
                            </span>
                        </div>
                    </div>
                ))}
             </div>
             <DialogFooter>
                <Button variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white" onClick={() => setShowConfirmation(false)} disabled={loading}>Cancel</Button>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleConfirmSubmit} disabled={loading}>
                    {loading ? "Submitting..." : "Confirm & Submit"}
                </Button>
             </DialogFooter>
         </DialogContent>
      </Dialog>
    </>
  );
} 