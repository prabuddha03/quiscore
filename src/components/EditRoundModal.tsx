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
import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { toast } from 'sonner';
import { Round } from "@prisma/client";

interface EditRoundModalProps {
  round: Round;
  onRoundUpdated: () => void;
}

type RoundRules = {
  pounce?: boolean;
  bounce?: boolean;
  direction?: string;
  scoring?: {
    directRight?: number;
    pounceRight?: number;
    pounceWrong?: number;
    bouncePoints?: number;
  };
};

export function EditRoundModal({ round, onRoundUpdated }: EditRoundModalProps) {
  const [name, setName] = useState(round.name);
  const [pounce, setPounce] = useState(false);
  const [bounce, setBounce] = useState(false);
  const [direction, setDirection] = useState("clockwise");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [directRight, setDirectRight] = useState(10);
  const [pounceRight, setPounceRight] = useState(15);
  const [pounceWrong, setPounceWrong] = useState(-5);
  const [bouncePoints, setBouncePoints] = useState(5);
  
  useEffect(() => {
    if (round.rules && typeof round.rules === 'object') {
        const rules = round.rules as RoundRules;
        setPounce(rules.pounce || false);
        setBounce(rules.bounce || false);
        setDirection(rules.direction || 'clockwise');
        if (rules.scoring) {
            setDirectRight(rules.scoring.directRight || 10);
            setPounceRight(rules.scoring.pounceRight || 15);
            setPounceWrong(rules.scoring.pounceWrong || -5);
            setBouncePoints(rules.scoring.bouncePoints || 5);
        }
    }
  }, [round]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a round name");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/round/${round.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
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
          
          <div className="space-y-4">
            <h4 className="font-medium text-gray-200 border-b border-gray-700 pb-2">Round Rules</h4>
            <div className="flex items-center space-x-2">
              <Checkbox id="pounce-edit" checked={pounce} onCheckedChange={(checked) => setPounce(Boolean(checked))} className="data-[state=checked]:bg-orange-500 border-gray-600"/>
              <Label htmlFor="pounce-edit" className="text-gray-300">Enable Pounce</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="bounce-edit" checked={bounce} onCheckedChange={(checked) => setBounce(Boolean(checked))} className="data-[state=checked]:bg-orange-500 border-gray-600"/>
              <Label htmlFor="bounce-edit" className="text-gray-300">Enable Bounce</Label>
            </div>
            <RadioGroup value={direction} onValueChange={setDirection} className="mt-2 space-y-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="clockwise" id="r1-edit" className="border-gray-600 text-orange-500 focus:ring-orange-500"/>
                <Label htmlFor="r1-edit" className="text-gray-300">Clockwise</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="anticlockwise" id="r2-edit" className="border-gray-600 text-orange-500 focus:ring-orange-500"/>
                <Label htmlFor="r2-edit" className="text-gray-300">Anti-clockwise</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-200 border-b border-gray-700 pb-2">Scoring Rules</h4>
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label htmlFor="bouncePoints-edit" className="text-sm text-gray-400">Bounce Points</Label>
                <Input
                  id="bouncePoints-edit"
                  type="number"
                  value={bouncePoints}
                  onChange={(e) => setBouncePoints(parseInt(e.target.value) || 0)}
                  className="mt-1 bg-gray-800 border-gray-600"
                />
              </div>
            </div>
          </div>
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