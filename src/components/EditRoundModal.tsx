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
import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { toast } from 'sonner';
import { Round, EventType } from "@prisma/client";

interface EditRoundModalProps {
  round: Round;
  onRoundUpdated: () => void;
  eventType: EventType;
}

type RoundRules = {
  pounce?: boolean;
  bounce?: boolean;
  isPounceOnly?: boolean;
  scoring?: {
    directRight?: number;
    directWrong?: number;
    pounceRight?: number;
    pounceWrong?: number;
    bouncePoints?: number;
    bounceWrong?: number;
  };
};

export function EditRoundModal({ round, onRoundUpdated, eventType }: EditRoundModalProps) {
  const [name, setName] = useState(round.name);
  const [pounce, setPounce] = useState(false);
  const [bounce, setBounce] = useState(false);
  const [roundType, setRoundType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [directRight, setDirectRight] = useState(10);
  const [directWrong, setDirectWrong] = useState(0);
  const [pounceRight, setPounceRight] = useState(15);
  const [pounceWrong, setPounceWrong] = useState(-5);
  const [bouncePoints, setBouncePoints] = useState(5);
  const [bounceWrong, setBounceWrong] = useState(-5);
  
  useEffect(() => {
    if (round.rules && typeof round.rules === 'object') {
        const rules = round.rules as RoundRules;
        setRoundType(rules.isPounceOnly ? 'pounceOnly' : 'direct');
        setPounce(rules.pounce || false);
        setBounce(rules.bounce || false);
        if (rules.scoring) {
            setDirectRight(rules.scoring.directRight || 10);
            setDirectWrong(rules.scoring.directWrong || 0);
            setPounceRight(rules.scoring.pounceRight || 15);
            setPounceWrong(rules.scoring.pounceWrong || -5);
            setBouncePoints(rules.scoring.bouncePoints || 5);
            setBounceWrong(rules.scoring.bounceWrong || -5);
        }
    } else {
      setRoundType('direct');
    }
  }, [round]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a round name");
      return;
    }
     if (!roundType) {
      toast.error("Please select a round type");
      return;
    }

    setLoading(true);

    const isQuiz = eventType === 'QUIZ';
    const isPounceOnly = roundType === 'pounceOnly';

    const res = await fetch(`/api/round/${round.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        rules: isQuiz ? { 
          isPounceOnly,
          pounce: isPounceOnly || pounce, 
          bounce: !isPounceOnly && bounce,
          scoring: {
            directRight: !isPounceOnly ? directRight : 0,
            directWrong: !isPounceOnly ? directWrong : 0,
            pounceRight,
            pounceWrong,
            bouncePoints: (!isPounceOnly && bounce) ? bouncePoints : 0,
            bounceWrong: (!isPounceOnly && bounce) ? bounceWrong : 0
          }
        } : null,
      }),
    });

    if (res.ok) {
      setOpen(false);
      onRoundUpdated();
      toast.success("Round updated successfully!");
    } else {
      console.error("Failed to update round");
      toast.error("Failed to update round");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white h-8 w-8">
            <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Edit Round: {round.name}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Update the details and scoring rules for this round.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto px-1">
          <div>
            <Label htmlFor="name" className="text-gray-300">
              Round Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 bg-gray-800 border-gray-600 focus:ring-orange-500"
              placeholder="E.g., General Knowledge"
            />
          </div>
          
          {eventType === 'QUIZ' && (
            <>
              <div className="space-y-2">
                <Label className="text-gray-300">Round Type</Label>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={roundType === 'direct' ? 'default' : 'outline'}
                      onClick={() => setRoundType('direct')}
                      className={`${roundType === 'direct' ? 'bg-orange-500 hover:bg-orange-600' : 'border-gray-600 hover:bg-gray-800'}`}
                    >
                      Direct Round
                    </Button>
                    <Button
                      type="button"
                      variant={roundType === 'pounceOnly' ? 'destructive' : 'outline'}
                      onClick={() => setRoundType('pounceOnly')}
                       className={`${roundType === 'pounceOnly' ? 'bg-red-600 hover:bg-red-700' : 'border-gray-600 hover:bg-gray-800'}`}
                    >
                      Pounce-Only Round
                    </Button>
                </div>
              </div>

              {roundType === 'direct' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-200 border-b border-gray-700 pb-2">Round Rules</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPounce(!pounce)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                          pounce
                              ? 'bg-orange-500 text-white shadow-inner'
                              : 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      Enable Pounce
                    </button>
                    <button
                      type="button"
                      onClick={() => setBounce(!bounce)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                          bounce
                              ? 'bg-orange-500 text-white shadow-inner'
                              : 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      Enable Bounce
                    </button>
                  </div>
                </div>
              )}

              {roundType && (
                 <div className="space-y-4">
                  <h4 className="font-medium text-gray-200 border-b border-gray-700 pb-2">Scoring Rules</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {roundType === 'direct' && (
                      <>
                        <div>
                          <Label htmlFor="directRight-edit" className="text-sm text-gray-400">Direct (Correct)</Label>
                          <Input
                            id="directRight-edit"
                            type="number"
                            value={directRight}
                            onChange={(e) => setDirectRight(parseInt(e.target.value) || 0)}
                            className="mt-1 bg-gray-800 border-gray-600"
                          />
                        </div>
                        <div>
                          <Label htmlFor="directWrong-edit" className="text-sm text-gray-400">Direct (Wrong)</Label>
                          <Input
                            id="directWrong-edit"
                            type="number"
                            value={directWrong}
                            onChange={(e) => setDirectWrong(parseInt(e.target.value) || 0)}
                            className="mt-1 bg-gray-800 border-gray-600"
                          />
                        </div>
                      </>
                    )}
                    {(roundType === 'pounceOnly' || (roundType === 'direct' && pounce)) && (
                      <>
                        <div>
                          <Label htmlFor="pounceRight-edit" className="text-sm text-gray-400">Pounce (Correct)</Label>
                          <Input
                            id="pounceRight-edit"
                            type="number"
                            value={pounceRight}
                            onChange={(e) => setPounceRight(parseInt(e.target.value) || 0)}
                            className="mt-1 bg-gray-800 border-gray-600"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pounceWrong-edit" className="text-sm text-gray-400">Pounce (Wrong)</Label>
                          <Input
                            id="pounceWrong-edit"
                            type="number"
                            value={pounceWrong}
                            onChange={(e) => setPounceWrong(parseInt(e.target.value) || 0)}
                            className="mt-1 bg-gray-800 border-gray-600"
                          />
                        </div>
                      </>
                    )}
                    {(roundType === 'direct' && bounce) && (
                      <>
                        <div>
                          <Label htmlFor="bouncePoints-edit" className="text-sm text-gray-400">Bounce (Correct)</Label>
                          <Input
                            id="bouncePoints-edit"
                            type="number"
                            value={bouncePoints}
                            onChange={(e) => setBouncePoints(parseInt(e.target.value) || 0)}
                            className="mt-1 bg-gray-800 border-gray-600"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bounceWrong-edit" className="text-sm text-gray-400">Bounce (Wrong)</Label>
                          <Input
                            id="bounceWrong-edit"
                            type="number"
                            value={bounceWrong}
                            onChange={(e) => setBounceWrong(parseInt(e.target.value) || 0)}
                            className="mt-1 bg-gray-800 border-gray-600"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white">
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 