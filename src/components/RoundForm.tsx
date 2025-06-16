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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { toast } from 'sonner';
import { EventType } from "@prisma/client";

export function RoundForm({ eventId, eventType, onRoundCreated }: { eventId: string, eventType: EventType, onRoundCreated: () => void }) {
  const [name, setName] = useState("");
  const [pounce, setPounce] = useState(false);
  const [bounce, setBounce] = useState(false);
  const [direction, setDirection] = useState("clockwise");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Scoring rules
  const [directRight, setDirectRight] = useState(10);
  const [pounceRight, setPounceRight] = useState(15);
  const [pounceWrong, setPounceWrong] = useState(-5);
  const [bouncePoints, setBouncePoints] = useState(5);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a round name");
      return;
    }

    setLoading(true);

    const isQuiz = eventType === 'QUIZ';

    const payload = {
        name,
        eventId,
        rules: isQuiz ? { 
          pounce, 
          bounce, 
          direction,
          scoring: {
            directRight,
            pounceRight,
            pounceWrong,
            bouncePoints
          }
        } : null,
      };

    const res = await fetch("/api/round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      // Reset form
      setName("");
      setPounce(false);
      setBounce(false);
      setDirection("clockwise");
      setDirectRight(10);
      setPounceRight(15);
      setPounceWrong(-5);
      setBouncePoints(5);
      setOpen(false);
      onRoundCreated();
    } else {
      console.error("Failed to create round");
      toast.error("Failed to create round");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <div className="space-y-4">
                <h4 className="font-medium text-gray-200 border-b border-gray-700 pb-2">Round Rules</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox id="pounce" checked={pounce} onCheckedChange={(checked) => setPounce(Boolean(checked))} className="data-[state=checked]:bg-orange-500 border-gray-600"/>
                  <Label htmlFor="pounce" className="text-gray-300">Enable Pounce</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="bounce" checked={bounce} onCheckedChange={(checked) => setBounce(Boolean(checked))} className="data-[state=checked]:bg-orange-500 border-gray-600"/>
                  <Label htmlFor="bounce" className="text-gray-300">Enable Bounce</Label>
                </div>
                <RadioGroup value={direction} onValueChange={setDirection} className="mt-2 space-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="clockwise" id="r1" className="border-gray-600 text-orange-500 focus:ring-orange-500"/>
                    <Label htmlFor="r1" className="text-gray-300">Clockwise</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="anticlockwise" id="r2" className="border-gray-600 text-orange-500 focus:ring-orange-500"/>
                    <Label htmlFor="r2" className="text-gray-300">Anti-clockwise</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-200 border-b border-gray-700 pb-2">Scoring Rules</h4>
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <Label htmlFor="bouncePoints" className="text-sm text-gray-400">Bounce Points</Label>
                    <Input
                      id="bouncePoints"
                      type="number"
                      value={bouncePoints}
                      onChange={(e) => setBouncePoints(parseInt(e.target.value) || 0)}
                      className="mt-1 bg-gray-800 border-gray-600"
                    />
                  </div>
                </div>
              </div>
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