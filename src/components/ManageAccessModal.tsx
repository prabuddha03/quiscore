"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ManageAccessModalProps {
  eventId: string;
  allowedEditors: string[];
  onAccessListUpdated: () => void;
}

export function ManageAccessModal({
  eventId,
  allowedEditors,
  onAccessListUpdated,
}: ManageAccessModalProps) {
  const [open, setOpen] = useState(false);
  const [editors, setEditors] = useState(allowedEditors);
  const [newEditor, setNewEditor] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddEditor = () => {
    if (newEditor && !editors.includes(newEditor)) {
      setEditors([...editors, newEditor]);
      setNewEditor("");
    } else {
        toast.warning("Email is invalid or already in the list.");
    }
  };

  const handleRemoveEditor = (emailToRemove: string) => {
    setEditors(editors.filter((email) => email !== emailToRemove));
  };
  
  const handleSave = async () => {
    setLoading(true);
    try {
        const res = await fetch(`/api/event/${eventId}/access`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allowedEditors: editors })
        });

        if (!res.ok) throw new Error('Failed to update access list');

        toast.success("Access list updated successfully!");
        onAccessListUpdated();
        setOpen(false);
    } catch (error) {
        console.error(error);
        toast.error("An error occurred while saving.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-gray-400 hover:text-white">
            <Settings className="h-4 w-4 mr-2"/> Manage Access
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Manage Access</DialogTitle>
          <DialogDescription className="text-gray-400">
            Add or remove editors who can manage this event.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-editor" className="text-gray-300">Add Editor</Label>
            <div className="flex space-x-2">
              <Input
                id="new-editor"
                value={newEditor}
                onChange={(e) => setNewEditor(e.target.value)}
                placeholder="editor@example.com"
                className="bg-gray-800 border-gray-600"
              />
              <Button onClick={handleAddEditor} size="icon" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Allowed Editors</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto p-1 rounded-md bg-gray-950/50">
              {editors.length > 0 ? (
                editors.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="flex justify-between items-center w-full bg-gray-800 border-gray-700 text-white"
                  >
                    <span>{email}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:bg-red-500/20"
                      onClick={() => handleRemoveEditor(email)}
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-center text-gray-500 py-4">No editors added yet.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="text-gray-300 border-gray-600 hover:bg-gray-800">Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                {loading ? "Saving..." : "Save Changes"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 