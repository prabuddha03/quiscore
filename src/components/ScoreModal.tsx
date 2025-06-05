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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Team, Round } from "@prisma/client";
import { useState, useEffect } from "react";

interface ScoreModalProps {
  teams: Team[];
  questionId: string;
  eventId: string;
  onScoreAdded?: () => void;
  roundId?: string;
}

export function ScoreModal({ teams, questionId, eventId, onScoreAdded, roundId }: ScoreModalProps) {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [points, setPoints] = useState(0);
  const [method, setMethod] = useState("direct");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [roundRules, setRoundRules] = useState<any>(null);
  const [customPoints, setCustomPoints] = useState([5, 10, 15, 20]);

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

  const handleSubmit = async () => {
    if (!selectedTeam) {
      alert("Please select a team");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeam,
          questionId,
          method,
          points,
          eventId,
        }),
      });

      if (response.ok) {
        // Reset form and close modal
        setSelectedTeam("");
        setPoints(0);
        setMethod("direct");
        setOpen(false);
        // Trigger parent refresh
        if (onScoreAdded) {
          onScoreAdded();
        }
        alert("Score added successfully!");
      } else {
        alert("Failed to add score");
      }
    } catch (error) {
      console.error("Error adding score:", error);
      alert("Error adding score");
    }
    setLoading(false);
  };

  const handleQuickScore = (pointValue: number, scoreMethod: string) => {
    setPoints(pointValue);
    setMethod(scoreMethod);
  };

  const getQuickScoreButtons = () => {
    const buttons = [];
    
    if (roundRules?.scoring) {
      const { directRight, pounceRight, pounceWrong, bouncePoints } = roundRules.scoring;
      
      buttons.push(
        <Button
          key="direct"
          variant="outline"
          size="sm"
          onClick={() => handleQuickScore(directRight, "direct")}
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
            onClick={() => handleQuickScore(pounceRight, "pounce-right")}
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
            onClick={() => handleQuickScore(pounceWrong, "pounce-wrong")}
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
            onClick={() => handleQuickScore(bouncePoints, "bounce")}
            className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
          >
            Bounce (+{bouncePoints})
          </Button>
        );
      }
    }

    // Add custom point buttons
    customPoints.forEach(point => {
      buttons.push(
        <Button
          key={`custom-${point}`}
          variant="outline"
          size="sm"
          onClick={() => handleQuickScore(point, "custom")}
          className="bg-purple-50 hover:bg-purple-100 border-purple-200"
        >
          +{point}
        </Button>
      );
    });

    return buttons;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Score</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Score Question</DialogTitle>
          <DialogDescription>
            Select a team and choose scoring method or enter custom points.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="team" className="text-right">
              Team
            </Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Score Buttons */}
          <div className="space-y-2">
            <Label>Quick Score</Label>
            <div className="flex flex-wrap gap-2">
              {getQuickScoreButtons()}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="points" className="text-right">
              Points
            </Label>
            <Input
              id="points"
              type="number"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
              className="col-span-3"
              placeholder="Enter points"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="method" className="text-right">
              Method
            </Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct Answer</SelectItem>
                <SelectItem value="pounce-right">Pounce (Correct)</SelectItem>
                <SelectItem value="pounce-wrong">Pounce (Wrong)</SelectItem>
                <SelectItem value="bounce">Bounce</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Point Buttons Management */}
          <div className="space-y-2">
            <Label>Manage Custom Buttons</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Add custom point value"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const value = parseInt((e.target as HTMLInputElement).value);
                    if (value && !customPoints.includes(value)) {
                      setCustomPoints([...customPoints, value]);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomPoints([5, 10, 15, 20])}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding Score..." : "Add Score"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 