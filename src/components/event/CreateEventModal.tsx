"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateEventModal } from "@/context/CreateEventModalContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateEventModal() {
  const { isCreateEventModalOpen, closeCreateEventModal } = useCreateEventModal();
  const [name, setName] = useState("");
  const [teams, setTeams] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type: "quiz", teams }),
    });

    if (res.ok) {
      const event = await res.json();
      closeCreateEventModal();
      router.push(`/event/${event.id}/admin`);
    } else {
      console.error("Failed to create event");
    }
    setLoading(false);
  };

  return (
    <Dialog open={isCreateEventModalOpen} onOpenChange={closeCreateEventModal}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new quiz event.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                placeholder="e.g., Tech Quiz 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <Input id="type" value="Quiz" disabled className="bg-gray-800 border-gray-600" />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="teams">Number of Teams</Label>
              <Input
                id="teams"
                type="number"
                placeholder="e.g., 8"
                value={teams}
                onChange={(e) => setTeams(parseInt(e.target.value))}
                className="bg-gray-800 border-gray-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeCreateEventModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 