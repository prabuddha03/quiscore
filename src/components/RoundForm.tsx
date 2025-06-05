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

export function RoundForm({ eventId, onRoundCreated }: { eventId: string, onRoundCreated: () => void }) {
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
      alert("Please enter a round name");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        eventId,
        rules: { 
          pounce, 
          bounce, 
          direction,
          scoring: {
            directRight,
            pounceRight,
            pounceWrong,
            bouncePoints
          }
        },
      }),
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
      alert("Failed to create round");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Round</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Round</DialogTitle>
          <DialogDescription>
            Enter the details and scoring rules for the new round.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Round 1"
            />
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium">Round Rules</h4>
            <div className="flex items-center space-x-2">
              <Checkbox id="pounce" checked={pounce} onCheckedChange={(checked) => setPounce(Boolean(checked))} />
              <Label htmlFor="pounce">Enable Pounce</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="bounce" checked={bounce} onCheckedChange={(checked) => setBounce(Boolean(checked))} />
              <Label htmlFor="bounce">Enable Bounce</Label>
            </div>
            <RadioGroup value={direction} onValueChange={setDirection}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="clockwise" id="r1" />
                <Label htmlFor="r1">Clockwise</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="anticlockwise" id="r2" />
                <Label htmlFor="r2">Anti-clockwise</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Scoring Rules</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="directRight">Direct Answer (Correct)</Label>
                <Input
                  id="directRight"
                  type="number"
                  value={directRight}
                  onChange={(e) => setDirectRight(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="pounceRight">Pounce (Correct)</Label>
                <Input
                  id="pounceRight"
                  type="number"
                  value={pounceRight}
                  onChange={(e) => setPounceRight(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="pounceWrong">Pounce (Wrong)</Label>
                <Input
                  id="pounceWrong"
                  type="number"
                  value={pounceWrong}
                  onChange={(e) => setPounceWrong(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="bouncePoints">Bounce Points</Label>
                <Input
                  id="bouncePoints"
                  type="number"
                  value={bouncePoints}
                  onChange={(e) => setBouncePoints(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add Round"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 