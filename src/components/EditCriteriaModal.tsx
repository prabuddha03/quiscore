"use client";

import { useState, FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Criteria } from "@prisma/client";
import { toast } from "sonner";
import { Edit } from "lucide-react";

interface EditCriteriaModalProps {
  criterion: Criteria;
  eventId: string;
  onCriteriaUpdated: () => void;
}

export const EditCriteriaModal: FC<EditCriteriaModalProps> = ({ criterion, eventId, onCriteriaUpdated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(criterion.name);
  const [maxPoints, setMaxPoints] = useState<number | ''>(criterion.maxPoints ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/event/${eventId}/criteria/${criterion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          maxPoints: Number(maxPoints) || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update criterion");
      }

      toast.success("Criterion updated successfully!");
      onCriteriaUpdated();
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update criterion.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Edit Criterion</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
                <Label htmlFor="name">Criterion Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-gray-800 border-gray-600"/>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="max-points">Max Points</Label>
                <Input
                    id="max-points"
                    type="number"
                    placeholder="e.g., 10"
                    value={maxPoints}
                    onChange={(e) => setMaxPoints(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="bg-gray-800 border-gray-600"
                />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 