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
import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { toast } from 'sonner';
import { EventType } from "@prisma/client";

export function RoundForm({ eventId, eventType, onRoundCreated }: { eventId: string, eventType: EventType, onRoundCreated: () => void }) {
  const [name, setName] = useState("");
  const [pounce, setPounce] = useState(false);
  const [bounce, setBounce] = useState(false);
  const [roundType, setRoundType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Scoring rules
  const [directRight, setDirectRight] = useState(10);
  const [directWrong, setDirectWrong] = useState(0);
  const [pounceRight, setPounceRight] = useState(15);
  const [pounceWrong, setPounceWrong] = useState(-5);
  const [bouncePoints, setBouncePoints] = useState(5);
  const [bounceWrong, setBounceWrong] = useState(-5);

  const handleReset = () => {
    setName("");
    setPounce(false);
    setBounce(false);
    setRoundType(null);
    setDirectRight(10);
    setDirectWrong(0);
    setPounceRight(15);
    setPounceWrong(-5);
    setBouncePoints(5);
    setBounceWrong(-5);
  }

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

    const payload = {
        name,
        eventId,
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
      };

    const res = await fetch("/api/round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      handleReset();
      setOpen(false);
      onRoundCreated();
    } else {
      console.error("Failed to create round");
      toast.error("Failed to create round");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) handleReset();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-500">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Round
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Add New Round</DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter the details and scoring rules for the new round.
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
                          <Label htmlFor="directRight" className="text-sm text-gray-400">Direct (Correct)</Label>
                          <Input
                            id="directRight"
                            type="number"
                            value={directRight}
                            onChange={(e) => setDirectRight(parseInt(e.target.value) || 0)}
                            className="mt-1 bg-gray-800 border-gray-600"
                          />
                        </div>
                        <div>
                          <Label htmlFor="directWrong" className="text-sm text-gray-400">Direct (Wrong)</Label>
                          <Input
                            id="directWrong"
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
                          <Label htmlFor="pounceRight" className="text-sm text-gray-400">Pounce (Correct)</Label>
                          <Input
                            id="pounceRight"
                            type="number"
                            value={pounceRight}
                            onChange={(e) => setPounceRight(parseInt(e.target.value) || 0)}
                            className="mt-1 bg-gray-800 border-gray-600"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pounceWrong" className="text-sm text-gray-400">Pounce (Wrong)</Label>
                          <Input
                            id="pounceWrong"
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
                          <Label htmlFor="bouncePoints" className="text-sm text-gray-400">Bounce (Correct)</Label>
                          <Input
                            id="bouncePoints"
                            type="number"
                            value={bouncePoints}
                            onChange={(e) => setBouncePoints(parseInt(e.target.value) || 0)}
                            className="mt-1 bg-gray-800 border-gray-600"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bounceWrong" className="text-sm text-gray-400">Bounce (Wrong)</Label>
                          <Input
                            id="bounceWrong"
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
            {loading ? "Adding..." : "Add Round"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 