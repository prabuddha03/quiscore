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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, CheckCircle } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

export function CreateEventModal() {
  const { isCreateEventModalOpen, closeCreateEventModal } = useCreateEventModal();
  const router = useRouter();

  // State
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("QUIZ");
  const [loading, setLoading] = useState(false);
  const [eventSubType, setEventSubType] = useState("");
  const [teamCount, setTeamCount] = useState(0);
  const [membersPerTeam, setMembersPerTeam] = useState(1);
  const [hasLeader, setHasLeader] = useState(false);
  const [hasDocumentLink, setHasDocumentLink] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [teamsData, setTeamsData] = useState<any[]>([]);

  const handleTeamCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    setTeamCount(count >= 0 ? count : 0);
  };

  const handleMembersPerTeamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    setMembersPerTeam(count >= 1 ? count : 1);
  };
  
  const generateSampleCsv = () => {
    let headers = ["team_name"];
    for (let i = 1; i <= membersPerTeam; i++) {
      headers.push(`member_${i}_name`);
    }
    if (hasLeader) {
      headers.push("leader_name", "leader_contact");
    }
    if (hasDocumentLink) {
        headers.push("document_link");
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_teams_upload.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setTeamsData(results.data);
          toast.success(`${results.data.length} teams parsed from ${file.name}.`);
        },
        error: (error: any) => {
          toast.error(`CSV parsing error: ${error.message}`);
        },
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const body: any = { name, type: eventType };

    if (eventType === 'QUIZ') {
      body.teams = teamCount;
    } else if (eventType === 'GENERAL') {
      body.subType = eventSubType;
      // If teams were uploaded via CSV, send that data. Otherwise, send the count.
      if (teamsData.length > 0) {
        body.teamsData = teamsData;
      } else {
        body.teams = teamCount;
      }
    }

    const res = await fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const event = await res.json();
      toast.success("Event created successfully!");
      closeCreateEventModal();
      router.push(`/event/${event.id}/admin`);
    } else {
      const { error } = await res.json();
      toast.error(`Failed to create event: ${error}`);
    }
    setLoading(false);
  };

  return (
    <Dialog open={isCreateEventModalOpen} onOpenChange={closeCreateEventModal}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new event. Select a type to get started.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Fields */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Event Name</Label>
              <Input id="name" placeholder="e.g., Annual Tech Fest" value={name} onChange={(e) => setName(e.target.value)} className="bg-gray-800 border-gray-600"/>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="type">Event Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger className="bg-gray-800 border-gray-600"><SelectValue placeholder="Select event type" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="QUIZ">Quiz</SelectItem>
                      <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
              </Select>
            </div>

            {/* Quiz Specific Fields */}
            {eventType === 'QUIZ' && (
              <div className="space-y-1.5">
                <Label htmlFor="teams-quiz">Number of Teams</Label>
                <Input id="teams-quiz" type="number" placeholder="e.g., 8" value={teamCount} onChange={handleTeamCountChange} className="bg-gray-800 border-gray-600"/>
              </div>
            )}

            {/* General Event Fields */}
            {eventType === 'GENERAL' && (
              <div className="space-y-4 rounded-md border border-gray-700 p-4">
                <h3 className="text-lg font-medium text-white">General Event Setup</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-type">Scoring Type</Label>
                  <Select value={eventSubType} onValueChange={setEventSubType}>
                      <SelectTrigger className="bg-gray-800 border-gray-600"><SelectValue placeholder="Select scoring type" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="judge_based_individual">Judge Based (Individual)</SelectItem>
                          <SelectItem value="general_scoring">General Scoring</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                
                <div className="border-t border-gray-700 my-2"></div>
                <h4 className="text-md font-medium text-white">Team Setup</h4>
                
                <div className="space-y-1.5">
                  <Label htmlFor="teams-general">Number of Teams (if not using CSV)</Label>
                  <Input id="teams-general" type="number" placeholder="e.g., 8" value={teamCount} onChange={handleTeamCountChange} className="bg-gray-800 border-gray-600 flex-grow" disabled={!!uploadedFile}/>
                </div>

                <div className="border-t border-gray-700 my-2"></div>
                <h4 className="text-md font-medium text-white">Or Upload via CSV</h4>

                <p className="text-xs text-gray-400">First, configure and download the sample file. Then, fill it out and upload it here.</p>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="members-per-team">Members per Team</Label>
                        <Input id="members-per-team" type="number" value={membersPerTeam} onChange={handleMembersPerTeamChange} className="bg-gray-800 border-gray-600"/>
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                        <Checkbox id="has-leader" checked={hasLeader} onCheckedChange={(c) => setHasLeader(c as boolean)} />
                        <Label htmlFor="has-leader">Has a Leader?</Label>
                    </div>
                </div>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="has-doc-link" checked={hasDocumentLink} onCheckedChange={(c) => setHasDocumentLink(c as boolean)} />
                    <Label htmlFor="has-doc-link">Has a Document Link?</Label>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <Button type="button" variant="outline" onClick={generateSampleCsv} className="w-full">
                        <FileText className="h-4 w-4 mr-2"/>
                        Download CSV Sample
                    </Button>
                    <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden"/>
                    <Button asChild type="button" variant="outline" className="w-full">
                        <Label htmlFor="csv-upload" className="cursor-pointer flex items-center justify-center">
                            <Upload className="h-4 w-4 mr-2"/>
                            Upload CSV
                        </Label>
                    </Button>
                </div>
                {uploadedFile && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <p>{uploadedFile.name} ({teamsData.length} teams) ready for creation.</p>
                    </div>
                )}
              </div>
            )}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeCreateEventModal}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 