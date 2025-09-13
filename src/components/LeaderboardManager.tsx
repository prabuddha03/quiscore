"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Trophy, Plus, Calendar, Trash2, RefreshCw, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

interface Participant {
  id: string;
  name: string;
  email?: string;
  phone: string;
}

interface Event {
  id: string;
  name: string;
  type: string;
  createdAt: string;
}

interface Participation {
  id: string;
  score: number;
  teamRank: number;
  team: {
    id: string;
    name: string;
  };
  event: {
    id: string;
    name: string;
  };
}

interface LeaderboardParticipant {
  id: string;
  leaderboardId: string;
  participantId: string;
  totalScore: number;
  rank: number;
  participant: Participant;
  participations: Participation[];
  createdAt: string;
  updatedAt: string;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  eventIds: string[];
  participants: LeaderboardParticipant[];
  createdAt: string;
  updatedAt: string;
}

export function LeaderboardManager() {
  const [leaderboards, setLeaderboards] = useState<LeaderboardEntry[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [leaderboardName, setLeaderboardName] = useState<string>("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching data...');
      const [leaderboardRes, eventsRes] = await Promise.all([
        fetch('/api/leaderboard'),
        fetch('/api/event')
      ]);

      console.log('API responses:', {
        leaderboard: leaderboardRes.status,
        events: eventsRes.status
      });

      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        console.log('Leaderboards:', leaderboardData);
        setLeaderboards(leaderboardData);
      }


      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        console.log('Fetched events:', eventsData);
        setEvents(eventsData);
      } else {
        console.error('Failed to fetch events:', eventsRes.status, eventsRes.statusText);
        const errorText = await eventsRes.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-recalculate every 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('🔄 Auto-recalculating leaderboards...');
      try {
        const response = await fetch('/api/leaderboard/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recalculateAll: true })
        });

        if (response.ok) {
          console.log('✅ Auto-recalculation completed');
          await fetchData(); // Refresh the data
        } else {
          console.error('❌ Auto-recalculation failed');
        }
      } catch (error) {
        console.error('❌ Auto-recalculation error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const handleCreateLeaderboard = async () => {
    if (!leaderboardName || selectedEvents.length === 0) {
      toast.error('Please enter a leaderboard name and select at least one event');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leaderboardName,
          eventIds: selectedEvents
        })
      });

      if (response.ok) {
        toast.success('Leaderboard created successfully!');
        setIsCreateOpen(false);
        setLeaderboardName("");
        setSelectedEvents([]);
        await fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create leaderboard');
      }
    } catch (error) {
      console.error('Error creating leaderboard:', error);
      toast.error('Failed to create leaderboard');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteLeaderboard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leaderboard?')) return;

    try {
      const response = await fetch(`/api/leaderboard/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Leaderboard deleted successfully!');
        await fetchData();
      } else {
        toast.error('Failed to delete leaderboard');
      }
    } catch (error) {
      console.error('Error deleting leaderboard:', error);
      toast.error('Failed to delete leaderboard');
    }
  };

  const copyPublicLink = (leaderboardId: string) => {
    const publicUrl = `${window.location.origin}/leaderboard/${leaderboardId}/public`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      toast.success('Public link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const openPublicLeaderboard = (leaderboardId: string) => {
    const publicUrl = `${window.location.origin}/leaderboard/${leaderboardId}/public`;
    window.open(publicUrl, '_blank');
  };

  const handleRecalculateAll = async () => {
    try {
      const response = await fetch('/api/leaderboard/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recalculateAll: true })
      });

      if (response.ok) {
        toast.success('All leaderboards recalculated!');
        await fetchData();
      } else {
        toast.error('Failed to recalculate leaderboards');
      }
    } catch (error) {
      console.error('Error recalculating leaderboards:', error);
      toast.error('Failed to recalculate leaderboards');
    }
  };

  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  if (loading) {
    return (
      <Card className="bg-gray-900/50 border-white/10">
        <CardContent className="p-8">
          <div className="text-center text-gray-400">Loading leaderboard data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Leaderboard Manager
            </CardTitle>
            <div className="flex gap-2">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleRecalculateAll}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 hover:bg-gray-800"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recalculate All
                </Button>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  Auto-recalculating every 5 minutes
                </Badge>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Leaderboard
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl bg-gray-900 text-white border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Create New Leaderboard
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Leaderboard Name */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-300">
                        Leaderboard Name
                      </Label>
                      <Input
                        value={leaderboardName}
                        onChange={(e) => setLeaderboardName(e.target.value)}
                        placeholder="Enter leaderboard name (e.g., Quiz Championship 2024)"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>

                    {/* Event Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-300">
                        Select Events ({selectedEvents.length} selected)
                      </Label>
                      <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-700 rounded-lg p-4">
                        {loading ? (
                          <div className="text-center text-gray-400 py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                            <p>Loading events...</p>
                          </div>
                        ) : events.length === 0 ? (
                          <div className="text-center text-gray-400 py-4">
                            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No events found</p>
                            <p className="text-sm">Create some events first</p>
                          </div>
                        ) : (
                          events.map((event) => (
                          <div key={event.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={event.id}
                              checked={selectedEvents.includes(event.id)}
                              onCheckedChange={() => toggleEventSelection(event.id)}
                              className="border-gray-600"
                            />
                            <Label
                              htmlFor={event.id}
                              className="flex-1 cursor-pointer text-sm text-gray-300"
                            >
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">{event.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {event.type}
                                </Badge>
                              </div>
                            </Label>
                          </div>
                        ))
                        )}
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="border-t border-gray-700 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                      className="border-gray-600 hover:bg-gray-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateLeaderboard}
                      disabled={isCreating || !leaderboardName || selectedEvents.length === 0}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {isCreating ? 'Creating...' : 'Create Leaderboard'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Leaderboards List */}
      <div className="space-y-4">
        {leaderboards.length === 0 ? (
          <Card className="bg-gray-900/50 border-white/10">
            <CardContent className="p-8">
              <div className="text-center text-gray-400">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No leaderboards created yet.</p>
                <p className="text-sm mt-2">Create your first leaderboard to get started.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          leaderboards.map((leaderboard) => (
            <Card key={leaderboard.id} className="bg-gray-900/50 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {leaderboard.name}
                    </h3>
                    <div className="text-sm text-gray-400">
                      {leaderboard.participants.length} participants • {leaderboard.eventIds.length} events
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">
                      Created {new Date(leaderboard.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Events */}
                  <div>
                    <div className="text-sm font-medium text-gray-300 mb-2">
                      Events ({leaderboard.eventIds.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {leaderboard.eventIds.map(eventId => {
                        const event = events.find(e => e.id === eventId);
                        return (
                          <Badge key={eventId} variant="outline" className="text-xs">
                            {event?.name || eventId}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {/* Participants */}
                  <div>
                    <div className="text-sm font-medium text-gray-300 mb-2">
                      Participants ({leaderboard.participants.length})
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {leaderboard.participants.map((participant, index) => (
                        <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-lg font-bold text-orange-400 w-8">
                              #{participant.rank || index + 1}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">
                                {participant.participant.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                {participant.participant.email && (
                                  <span>{participant.participant.email} • </span>
                                )}
                                {participant.participant.phone}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">
                              {participant.totalScore}
                            </div>
                            <div className="text-xs text-gray-400">points</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPublicLeaderboard(leaderboard.id)}
                        className="text-green-400 border-green-400 hover:bg-green-400/10"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Public
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyPublicLink(leaderboard.id)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLeaderboard(leaderboard.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
