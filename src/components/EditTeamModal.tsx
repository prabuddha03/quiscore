/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, FC } from "react";
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
import { Team, Prisma } from "@prisma/client";
import { toast } from "sonner";
import { Edit, Star } from "lucide-react";

interface Player {
  id?: string;
  name: string;
  isLeader?: boolean;
}

// This overrides the 'players' field from the Prisma `Team` type to avoid conflicts
interface TeamWithPlayers extends Omit<Team, 'players'> {
  players: Prisma.JsonValue;
}

interface EditTeamModalProps {
  team: TeamWithPlayers;
  onTeamUpdated: () => void;
}

export const EditTeamModal: FC<EditTeamModalProps> = ({ team, onTeamUpdated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [teamName, setTeamName] = useState(team.name);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");

  useEffect(() => {
    setTeamName(team.name);
    
    // Safely parse the 'players' JSON from the database
    let parsedPlayers: Player[] = [];
    const dbPlayers = team.players;

    if (dbPlayers && typeof dbPlayers === 'object') {
        if (Array.isArray(dbPlayers)) {
            // Handles old format (simple array of players)
            parsedPlayers = dbPlayers.map((p: any) => ({ name: p.name, isLeader: p.isLeader || false }));
        } else {
            // Handles new format ({ members: [], leader: {} })
            const data = dbPlayers as any;
            if (data.members && Array.isArray(data.members)) {
                parsedPlayers = data.members.map((p: any) => ({
                    name: p.name,
                    isLeader: data.leader?.name === p.name,
                }));
            }
        }
    }
    setPlayers(parsedPlayers);
  }, [team]);

  const handleAddPlayer = () => {
    if (newPlayerName.trim() === "") return;
    const newPlayer: Player = { name: newPlayerName.trim() };
    
    if (players.length === 0) {
        newPlayer.isLeader = true;
    }

    setPlayers([...players, newPlayer]);
    setNewPlayerName("");
  };

  const handleRemovePlayer = (indexToRemove: number) => {
    const newPlayers = players.filter((_, index) => index !== indexToRemove);
    
    const wasLeaderRemoved = !newPlayers.some(p => p.isLeader);
    if (wasLeaderRemoved && newPlayers.length > 0) {
      newPlayers[0].isLeader = true;
    }

    setPlayers(newPlayers);
  };
  
  const handleSetLeader = (leaderIndex: number) => {
    setPlayers(currentPlayers =>
        currentPlayers.map((player, index) => ({
            ...player,
            isLeader: index === leaderIndex,
        }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Re-construct the JSON object for the database
      const leader = players.find(p => p.isLeader);
      const members = players.map(({ name }) => ({ name }));
      const playersJson: Prisma.JsonValue = {
        members,
        leader: leader ? { name: leader.name } : undefined,
      };

      const response = await fetch(`/api/team/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName,
          players: playersJson,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update team");
      }

      toast.success("Team updated successfully!");
      onTeamUpdated();
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update team.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="ml-2">
            <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Team Name
              </Label>
              <Input
                id="name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="col-span-3 bg-gray-800 border-gray-600"
              />
            </div>
            <div className="col-span-4">
                <Label>Players</Label>
                <div className="mt-2 space-y-2">
                    {players.map((player, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-800 p-2 rounded">
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => handleSetLeader(index)} className="text-gray-400 hover:text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed" disabled={player.isLeader}>
                                <Star className={`h-5 w-5 transition-colors ${player.isLeader ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                            </button>
                            <span className="font-medium">{player.name}</span>
                        </div>
                        <Button type="button" variant="destructive" size="sm" onClick={() => handleRemovePlayer(index)}>
                          Remove
                        </Button>
                    </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
                <Label htmlFor="new-player" className="text-right">
                    New Player
                </Label>
                <Input
                    id="new-player"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="col-span-3 bg-gray-800 border-gray-600"
                    placeholder="Enter player name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPlayer();
                      }
                    }}
                />
            </div>
             <div className="col-span-4 text-right">
                <Button type="button" variant="outline" onClick={handleAddPlayer}>Add Player</Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 