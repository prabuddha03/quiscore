"use client";

import { useState } from "react";
import { Judge } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { Trash2, PlusCircle } from "lucide-react";

interface JudgeManagementProps {
  eventId: string;
  judges: Judge[];
  onUpdate: () => void;
}

export function JudgeManagement({ eventId, judges, onUpdate }: JudgeManagementProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddJudge = async () => {
    if (!name || !email) {
      toast.error("Please provide both name and email for the judge.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/event/${eventId}/judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });

    if (res.ok) {
      toast.success("Judge added successfully!");
      setName("");
      setEmail("");
      onUpdate();
    } else {
      const { error } = await res.json();
      toast.error(`Failed to add judge: ${error}`);
    }
    setLoading(false);
  };

  const handleRemoveJudge = async (judgeId: string) => {
    setLoading(true);
    const res = await fetch(`/api/event/${eventId}/judge`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ judgeId }),
    });

    if (res.ok) {
      toast.success("Judge removed successfully!");
      onUpdate();
    } else {
      const { error } = await res.json();
      toast.error(`Failed to remove judge: ${error}`);
    }
    setLoading(false);
  };

  return (
    <Card className="bg-gray-900/50 border-white/10 mt-8">
      <CardHeader>
        <CardTitle className="text-white">Judge Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-200">Add New Judge</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="judge-name" className="text-gray-400">Judge Name</Label>
              <Input id="judge-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Jane Doe" className="bg-gray-800 border-gray-600" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="judge-email" className="text-gray-400">Judge Email</Label>
              <Input id="judge-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="judge@example.com" className="bg-gray-800 border-gray-600" />
            </div>
          </div>
          <Button onClick={handleAddJudge} disabled={loading} size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            {loading ? "Adding..." : "Add Judge"}
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-200">Current Judges</h3>
          <div className="space-y-2">
            {judges.length > 0 ? (
              judges.map((judge) => (
                <div key={judge.id} className="flex items-center justify-between bg-gray-800/60 p-3 rounded-md">
                  <div>
                    <p className="font-medium text-white">{judge.name}</p>
                    <p className="text-sm text-gray-400">{judge.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveJudge(judge.id)} disabled={loading}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No judges have been added to this event yet.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 