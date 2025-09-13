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
import { Badge } from "@/components/ui/badge";
import { Team, Participant, Participation } from "@prisma/client";
import { toast } from "sonner";
import { Edit, Star, Plus, Trash2, User, Mail, Phone, Crown, Loader2 } from "lucide-react";

interface ParticipantFormData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  isLeader?: boolean;
  isExisting?: boolean; // Flag to indicate if this is an existing participant
}

// Team with participations (no direct participants relationship)
type TeamWithParticipations = Team & { 
  participations?: (Participation & { participant: Participant })[];
};

interface EditTeamModalProps {
  team: TeamWithParticipations;
  onTeamUpdated: () => void;
}

export const EditTeamModal: FC<EditTeamModalProps> = ({ team, onTeamUpdated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedTeam, setFetchedTeam] = useState<TeamWithParticipations | null>(null);
  const [teamName, setTeamName] = useState(team.name);
  const [participants, setParticipants] = useState<ParticipantFormData[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newParticipant, setNewParticipant] = useState<ParticipantFormData>({
    name: '',
    email: '',
    phone: '',
    isLeader: false
  });

  // Function to fetch fresh team data from the database
  const fetchTeamData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/team/${team.id}`);
      if (response.ok) {
        const teamData = await response.json();
        setFetchedTeam(teamData);
        return teamData;
      } else {
        throw new Error('Failed to fetch team data');
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to fetch team data');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update form data from team data
  const updateFormData = (teamData: TeamWithParticipations) => {
    setTeamName(teamData.name);
    
    // Use participations data (joined with participant) instead of direct participants
    const participations = teamData.participations || [];
    console.log(`EditTeamModal: Processing ${participations.length} participations for team ${teamData.name}`);
    
    const formParticipants: ParticipantFormData[] = participations.map((participation, index) => {
      const participantData = {
        id: participation.participant?.id,
        name: participation.participant?.name || '',
        email: participation.participant?.email || '',
        phone: participation.participant?.phone || '',
        isLeader: index === 0, // First participant is considered leader
        isExisting: true // All participants from database are existing
      };
      console.log(`Participation ${index + 1}:`, participantData);
      return participantData;
    });

    // Always use the actual participants from the database via participations
    setParticipants(formParticipants);
  };

  useEffect(() => {
    // Only update form data if team has participations, otherwise wait for fetch
    if (team.participations && team.participations.length > 0) {
      updateFormData(team);
    }
  }, [team]);

  const handleAddParticipant = () => {
    if (newParticipant.name.trim() === "") {
      toast.error("Participant name is required");
      return;
    }

    const participantToAdd = {
      ...newParticipant,
      name: newParticipant.name.trim(),
      email: newParticipant.email.trim(),
      phone: newParticipant.phone.trim() || 'N/A',
      isExisting: false // New participants are not existing
    };

    setParticipants([...participants, participantToAdd]);
    setNewParticipant({
      name: '',
      email: '',
      phone: '',
      isLeader: false
    });
  };

  const handleRemoveParticipant = (indexToRemove: number) => {
    const newParticipants = participants.filter((_, index) => index !== indexToRemove);
    
    const wasLeaderRemoved = !newParticipants.some(p => p.isLeader);
    if (wasLeaderRemoved && newParticipants.length > 0) {
      newParticipants[0].isLeader = true;
    }

    setParticipants(newParticipants);
  };
  
  const handleSetLeader = (leaderIndex: number) => {
    setParticipants(currentParticipants =>
        currentParticipants.map((participant, index) => ({
            ...participant,
            isLeader: index === leaderIndex,
        }))
    );
  };

  const handleEditParticipant = (index: number) => {
    setEditingIndex(index);
    setNewParticipant(participants[index]);
  };

  const handleUpdateParticipant = () => {
    if (editingIndex === null || newParticipant.name.trim() === "") {
      toast.error("Participant name is required");
      return;
    }

    const updatedParticipants = [...participants];
    updatedParticipants[editingIndex] = {
      ...newParticipant,
      name: newParticipant.name.trim(),
      email: newParticipant.email.trim(),
      phone: newParticipant.phone.trim() || 'N/A'
    };

    setParticipants(updatedParticipants);
    setEditingIndex(null);
    setNewParticipant({
      name: '',
      email: '',
      phone: '',
      isLeader: false
    });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setNewParticipant({
      name: '',
      email: '',
      phone: '',
      isLeader: false
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate team name
    if (!teamName.trim()) {
      toast.error("Team name is required");
      return;
    }
    
    // Validate participants
    if (participants.length === 0) {
      toast.error("At least one participant is required");
      return;
    }

    // Validate each participant
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      if (!participant.name.trim()) {
        toast.error(`Participant ${i + 1} name is required`);
        return;
      }
      if (!participant.phone.trim()) {
        toast.error(`Participant ${i + 1} phone is required`);
        return;
      }
    }

    try {
      // Prepare participants data for the API
      const participantsData = participants.map(participant => ({
        id: participant.id,
        name: participant.name.trim(),
        email: participant.email?.trim() || null,
        phone: participant.phone.trim() || 'N/A'
      }));

      console.log('Submitting team data:', { name: teamName, participants: participantsData });

      const response = await fetch(`/api/team/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName.trim(),
          participants: participantsData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || "Failed to update team");
      }

      const updatedTeam = await response.json();
      console.log('Updated team data:', updatedTeam);

      toast.success("Team updated successfully!");
      
      // Update local state with the response data
      setTeamName(updatedTeam.name);
      
      // Convert updated participations to form format
    const updatedParticipants = updatedTeam.participations?.map((participation: Participation & { participant: Participant }, index: number) => ({
      id: participation.participant?.id,
      name: participation.participant?.name || '',
      email: participation.participant?.email || '',
      phone: participation.participant?.phone || '',
      isLeader: index === 0, // First participant is considered leader
      isExisting: true // All participants from database are existing
    })) || [];
      
      setParticipants(updatedParticipants);
      
      // Call the parent callback to refresh the parent component's data
      onTeamUpdated();
      setIsOpen(false);
      
      // Reset form state
      setEditingIndex(null);
      setNewParticipant({
        name: '',
        email: '',
        phone: '',
        isLeader: false
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update team.");
    }
  };

  const handleModalClose = async (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form state when modal is closed
      setEditingIndex(null);
      setNewParticipant({
        name: '',
        email: '',
        phone: '',
        isLeader: false
      });
    } else {
      // When modal opens, fetch fresh data from the database
      const teamData = await fetchTeamData();
      if (teamData) {
        updateFormData(teamData);
      }
    }
  };

  return (
    <Dialog key={team.id} open={isOpen} onOpenChange={handleModalClose}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="ml-2 hover:bg-gray-700">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl bg-gray-900 text-white border-gray-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Team: {fetchedTeam?.name || team.name}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading team data...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Name Section */}
            <div className="space-y-2">
              <Label htmlFor="team-name" className="text-sm font-medium text-gray-300">
                Team Name
              </Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="bg-gray-800 border-gray-600 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter team name"
              />
            </div>

            {/* Participants List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-300">
                  Team Participants ({participants.length})
                </Label>
                <Badge variant="outline" className="text-xs">
                  {participants.filter(p => p.isLeader).length} Leader{participants.filter(p => p.isLeader).length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {participants.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No participants found for this team.</p>
                  <p className="text-sm mt-2">Add participants below to get started.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {participants.map((participant, index) => (
                    <div key={index} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleSetLeader(index)}
                              className="text-gray-400 hover:text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              disabled={participant.isLeader}
                              title={participant.isLeader ? "Team Leader" : "Set as Leader"}
                            >
                              {participant.isLeader ? (
                                <Crown className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                              ) : (
                                <Star className="h-5 w-5" />
                              )}
                            </button>
                            <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-white">{participant.name}</span>
                            {participant.isLeader && (
                              <Badge variant="secondary" className="text-xs bg-yellow-400/20 text-yellow-400 border-yellow-400/30">
                                Leader
                              </Badge>
                            )}
                            {participant.isExisting && (
                              <Badge variant="outline" className="text-xs bg-green-400/20 text-green-400 border-green-400/30">
                                Existing
                              </Badge>
                            )}
                          </div>
                              <div className="space-y-1 text-sm text-gray-400">
                                {participant.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3" />
                                    <span>{participant.email}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3" />
                                  <span>{participant.phone}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditParticipant(index)}
                            className="text-gray-400 hover:text-blue-400 hover:bg-blue-400/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveParticipant(index)}
                            className="text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                            disabled={participants.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add/Edit Participant Form */}
            <div className="space-y-4 border-t border-gray-700 pt-4">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <Label className="text-sm font-medium text-gray-300">
                  {editingIndex !== null ? 'Edit Participant' : 'Add New Participant'}
                </Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="participant-name" className="text-xs text-gray-400">
                    Name *
                  </Label>
                  <Input
                    id="participant-name"
                    value={newParticipant.name}
                    onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})}
                    className="bg-gray-800 border-gray-600 focus:ring-orange-500"
                    placeholder="Enter participant name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="participant-email" className="text-xs text-gray-400">
                    Email
                  </Label>
                  <Input
                    id="participant-email"
                    type="email"
                    value={newParticipant.email}
                    onChange={(e) => setNewParticipant({...newParticipant, email: e.target.value})}
                    className="bg-gray-800 border-gray-600 focus:ring-orange-500"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="participant-phone" className="text-xs text-gray-400">
                    Phone *
                  </Label>
                  <Input
                    id="participant-phone"
                    value={newParticipant.phone}
                    onChange={(e) => setNewParticipant({...newParticipant, phone: e.target.value})}
                    className="bg-gray-800 border-gray-600 focus:ring-orange-500"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Role</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is-leader"
                      checked={newParticipant.isLeader}
                      onChange={(e) => setNewParticipant({...newParticipant, isLeader: e.target.checked})}
                      className="rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500"
                    />
                    <Label htmlFor="is-leader" className="text-xs text-gray-400">
                      Set as team leader
                    </Label>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {editingIndex !== null ? (
                  <>
                    <Button
                      type="button"
                      onClick={handleUpdateParticipant}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Update Participant
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="border-gray-600 hover:bg-gray-800"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={handleAddParticipant}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Participant
                  </Button>
                )}
              </div>
            </div>

            <DialogFooter className="border-t border-gray-700 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleModalClose(false)}
                className="border-gray-600 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Save Team Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}; 