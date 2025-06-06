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
import { Team, Round } from "@prisma/client";
import { useState, useEffect } from "react";
import { Plus, Minus, CheckCircle, AlertCircle } from "lucide-react";

interface TeamScoreModalProps {
  teams: Team[];
  questionId: string;
  eventId: string;
  onScoreAdded?: () => void;
  roundId?: string;
}

interface ExistingScore {
  id: string;
  teamId: string;
  method: string;
  points: number;
}

export function TeamScoreModal({ teams, questionId, eventId, onScoreAdded, roundId }: TeamScoreModalProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [roundRules, setRoundRules] = useState<any>(null);
  const [teamScores, setTeamScores] = useState<Record<string, number>>({});
  const [teamMethods, setTeamMethods] = useState<Record<string, string>>({});
  const [existingScores, setExistingScores] = useState<ExistingScore[]>([]);
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

  // Fetch existing scores to determine if we're in edit mode
  useEffect(() => {
    const fetchExistingScores = async () => {
      try {
        const res = await fetch(`/api/question/${questionId}/scores`);
        if (res.ok) {
          const scores = await res.json();
          setExistingScores(scores);
          setIsEditMode(scores.length > 0);
        }
      } catch (error) {
        console.error("Failed to fetch existing scores:", error);
      }
    };

    fetchExistingScores();
  }, [questionId]);

  // Initialize teams with default "direct" method and existing scores when modal opens
  useEffect(() => {
    if (open && teams.length > 0) {
      const defaultMethods: Record<string, string> = {};
      const existingTeamScores: Record<string, number> = {};
      
      teams.forEach(team => {
        const existingScore = existingScores.find(score => score.teamId === team.id);
        if (existingScore) {
          defaultMethods[team.id] = existingScore.method;
          existingTeamScores[team.id] = existingScore.points;
        } else {
          defaultMethods[team.id] = 'direct';
        }
      });
      
      setTeamMethods(defaultMethods);
      setTeamScores(existingTeamScores);
    }
  }, [open, teams, existingScores]);

  const handleQuickScore = (teamId: string, points: number, method: string) => {
    setTeamScores(prev => ({ ...prev, [teamId]: points }));
    setTeamMethods(prev => ({ ...prev, [teamId]: method }));
  };

  const handleMethodSelect = (teamId: string, method: string) => {
    setTeamMethods(prev => ({ ...prev, [teamId]: method }));
    
    // Auto-set score based on method if round rules exist
    if (roundRules?.scoring) {
      const { directRight, pounceRight, bouncePoints } = roundRules.scoring;
      let points = 0;
      
      switch (method) {
        case 'direct':
          points = directRight;
          break;
        case 'pounce':
          points = pounceRight;
          break;
        case 'bounce':
          points = bouncePoints;
          break;
      }
      
      if (points !== 0) {
        setTeamScores(prev => ({ ...prev, [teamId]: points }));
      }
    }
  };

  const adjustScore = (teamId: string, delta: number) => {
    setTeamScores(prev => ({ 
      ...prev, 
      [teamId]: (prev[teamId] || 0) + delta 
    }));
    // Keep the current method when adjusting score manually
  };

  const resetTeamScore = (teamId: string) => {
    setTeamScores(prev => {
      const newScores = { ...prev };
      delete newScores[teamId];
      return newScores;
    });
    // Reset to default method
    setTeamMethods(prev => ({ ...prev, [teamId]: 'direct' }));
  };

  const handleShowConfirmation = () => {
    const teamIds = Object.keys(teamScores);
    if (teamIds.length === 0) {
      alert("Please set scores for at least one team");
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    const teamIds = Object.keys(teamScores);
    setLoading(true);
    
    try {
      // Use PUT for updates if in edit mode, POST for new scores
      const method = isEditMode ? "PUT" : "POST";
      
      // Submit scores for all teams with set scores
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
        // Reset form and close modals
        setTeamScores({});
        setTeamMethods({});
        setShowConfirmation(false);
        setOpen(false);
        // Trigger parent refresh
        if (onScoreAdded) {
          onScoreAdded();
        }
        alert(`Scores ${isEditMode ? 'updated' : 'added'} successfully for ${teamIds.length} team(s)!`);
      } else {
        alert(`Failed to ${isEditMode ? 'update' : 'add'} some scores`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} scores:`, error);
      alert(`Error ${isEditMode ? 'updating' : 'adding'} scores`);
    }
    setLoading(false);
  };

  const getQuickScoreButtons = (teamId: string) => {
    const buttons = [];
    
    if (roundRules?.scoring) {
      const { directRight, pounceRight, pounceWrong, bouncePoints } = roundRules.scoring;
      
      buttons.push(
        <Button
          key="direct"
          variant="outline"
          size="sm"
          onClick={() => handleQuickScore(teamId, directRight, "direct")}
          className="bg-green-50 hover:bg-green-100 border-green-200"
        >
          Direct (+{directRight})
        </Button>
      );

      if (roundRules.pounce) {
        buttons.push(
          <Button
            key="pounce-right"
            variant="outline"
            size="sm"
            onClick={() => handleQuickScore(teamId, pounceRight, "pounce-right")}
            className="bg-blue-50 hover:bg-blue-100 border-blue-200"
          >
            Pounce Right (+{pounceRight})
          </Button>
        );
        
        buttons.push(
          <Button
            key="pounce-wrong"
            variant="outline"
            size="sm"
            onClick={() => handleQuickScore(teamId, pounceWrong, "pounce-wrong")}
            className="bg-red-50 hover:bg-red-100 border-red-200"
          >
            Pounce Wrong ({pounceWrong})
          </Button>
        );
      }

      if (roundRules.bounce) {
        buttons.push(
          <Button
            key="bounce"
            variant="outline"
            size="sm"
            onClick={() => handleQuickScore(teamId, bouncePoints, "bounce")}
            className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
          >
            Bounce (+{bouncePoints})
          </Button>
        );
      }
    }

    return buttons;
  };

  const getScoreDisplay = (teamId: string) => {
    const score = teamScores[teamId];
    if (score === undefined) return "0";
    
    const colorClass = score > 0 ? "text-green-600" : score < 0 ? "text-red-600" : "text-gray-600";
    return <span className={`font-bold ${colorClass}`}>{score > 0 ? '+' : ''}{score}</span>;
  };

  const getMethodButtonStyle = (teamId: string, method: string) => {
    const isSelected = teamMethods[teamId] === method;
    
    switch (method) {
      case 'direct':
        return isSelected 
          ? "bg-green-800 text-white border-green-800 hover:bg-green-700" 
          : "bg-green-100 text-green-800 border-green-300 hover:bg-green-200";
      case 'pounce':
        return isSelected 
          ? "bg-blue-800 text-white border-blue-800 hover:bg-blue-700" 
          : "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200";
      case 'bounce':
        return isSelected 
          ? "bg-yellow-800 text-white border-yellow-800 hover:bg-yellow-700" 
          : "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200";
    }
  };

  const getMethodDisplay = (method: string) => {
    switch (method) {
      case 'direct':
        return { text: 'Direct Answer', icon: '✓', color: 'text-green-600' };
      case 'pounce':
        return { text: 'Pounce', icon: '⚡', color: 'text-blue-600' };
      case 'bounce':
        return { text: 'Bounce', icon: '⚪', color: 'text-yellow-600' };
      case 'pounce-right':
        return { text: 'Pounce (Correct)', icon: '⚡', color: 'text-blue-600' };
      case 'pounce-wrong':
        return { text: 'Pounce (Wrong)', icon: '⚡', color: 'text-red-600' };
      default:
        return { text: method, icon: '', color: 'text-gray-600' };
    }
  };

  const getTeamsWithChanges = () => {
    return Object.keys(teamScores).map(teamId => {
      const team = teams.find(t => t.id === teamId);
      const score = teamScores[teamId];
      const method = teamMethods[teamId] || 'direct';
      return { team, score, method };
    }).filter(item => item.team);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            {isEditMode ? "Edit Scores" : "Score All Teams"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Team Scores" : "Score All Teams"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update scores for teams. Existing scores are pre-populated."
                : "Set scores for multiple teams at once. Select method and use quick score buttons or adjust manually."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {teams.map((team) => (
              <div key={team.id} className="border rounded-lg p-4 space-y-4 bg-slate-50">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-lg">{team.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Score:</span>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {getScoreDisplay(team.id)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetTeamScore(team.id)}
                      className="text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Method Selection Buttons */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Method:</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMethodSelect(team.id, 'direct')}
                      className={getMethodButtonStyle(team.id, 'direct')}
                    >
                      ✓ Direct
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMethodSelect(team.id, 'pounce')}
                      className={getMethodButtonStyle(team.id, 'pounce')}
                    >
                      ⚡ Pounce
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMethodSelect(team.id, 'bounce')}
                      className={getMethodButtonStyle(team.id, 'bounce')}
                    >
                      ⚪ Bounce
                    </Button>
                  </div>
                </div>

                {/* Quick Score Buttons */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Quick Score:</span>
                  <div className="flex flex-wrap gap-2">
                    {getQuickScoreButtons(team.id)}
                  </div>
                </div>

                {/* Manual Adjust Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Adjust:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustScore(team.id, -5)}
                    className="text-xs bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
                  >
                    -5
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustScore(team.id, -1)}
                    className="w-8 h-8 p-0 bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustScore(team.id, +1)}
                    className="w-8 h-8 p-0 bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustScore(team.id, +5)}
                    className="text-xs bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                  >
                    +5
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustScore(team.id, +10)}
                    className="text-xs bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                  >
                    +10
                  </Button>
                </div>
                
                {/* Selected Method Display */}
                <div className="text-xs text-muted-foreground">
                  Selected method: <span className="font-medium capitalize">{teamMethods[team.id] || 'direct'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {Object.keys(teamScores).length} team(s) have scores set
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleShowConfirmation} 
                disabled={loading || Object.keys(teamScores).length === 0}
              >
                {isEditMode ? "Update All Scores" : "Add All Scores"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              {isEditMode ? "Confirm Score Updates" : "Confirm Score Changes"}
            </DialogTitle>
            <DialogDescription>
              Review the score changes below before confirming. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-sm font-medium text-muted-foreground">
              Teams with score changes ({getTeamsWithChanges().length}):
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {getTeamsWithChanges().map(({ team, score, method }) => {
                const methodDisplay = getMethodDisplay(method);
                return (
                  <div 
                    key={team!.id} 
                    className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-medium">{team!.name}</div>
                      <Badge 
                        variant="outline" 
                        className={`${methodDisplay.color} bg-white border-gray-300`}
                      >
                        {methodDisplay.icon} {methodDisplay.text}
                      </Badge>
                    </div>
                    
                    <Badge 
                      variant="outline" 
                      className={`font-bold text-lg px-3 py-1 ${
                        score > 0 ? 'bg-green-100 text-green-800 border-green-300' :
                        score < 0 ? 'bg-red-100 text-red-800 border-red-300' :
                        'bg-gray-100 text-gray-800 border-gray-300'
                      }`}
                    >
                      {score > 0 ? '+' : ''}{score}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Total teams: {getTeamsWithChanges().length}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmSubmit} 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading 
                  ? (isEditMode ? "Updating Scores..." : "Adding Scores...") 
                  : (isEditMode ? "Confirm & Update Scores" : "Confirm & Add Scores")
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 