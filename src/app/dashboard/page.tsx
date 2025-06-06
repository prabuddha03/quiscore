"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Event } from "@prisma/client";
import Link from "next/link";
import { PlusCircle, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ManageAccessModal } from "@/components/ManageAccessModal";
import { Badge } from "@/components/ui/badge";
import { useAuthModal } from "@/context/AuthModalContext";

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { openSignInModal } = useAuthModal();

  const fetchEvents = useCallback(async () => {
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') setLoading(false);
      return;
    };
    
    try {
      const res = await fetch("/api/user/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  if (status === "loading" || loading) {
    return (
      <div className="bg-black min-h-screen text-white">
        <div className="container mx-auto py-10 px-4">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
        <div className="bg-black min-h-screen text-white flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-400 mb-8">You must be signed in to view your dashboard.</p>
            <Button onClick={openSignInModal} className="bg-orange-500 hover:bg-orange-600 text-white">Sign In</Button>
        </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white">
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Events</h1>
            <Link href="/create">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Event
                </Button>
            </Link>
        </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="bg-gray-900/50 border-white/10 text-white flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl text-orange-400">{event.name}</CardTitle>
                  <CardDescription className="text-gray-500">
                    Created: {new Date(event.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-between">
                  <div className="mb-4 flex-grow">
                      <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Allowed Editors
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {event.allowedEditors.length > 0 ? (
                            event.allowedEditors.map(email => (
                                <Badge key={email} variant="outline" className="text-xs border-gray-600 text-gray-300">
                                    {email}
                                </Badge>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500">Only you can edit.</p>
                        )}
                      </div>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-white/10 pt-4 mt-4">
                    <Link href={`/event/${event.id}/admin`}>
                      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">Manage Event</Button>
                    </Link>
                    <Link href={`/event/${event.id}/scoreboard`}>
                      <Button variant="outline" className="w-full border-gray-600 hover:bg-gray-800">
                        View Scoreboard
                      </Button>
                    </Link>
                    <ManageAccessModal 
                        eventId={event.id} 
                        allowedEditors={event.allowedEditors} 
                        onAccessListUpdated={fetchEvents}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {events.length === 0 && (
            <div className="text-center py-16 bg-gray-900/50 border border-dashed border-gray-700 rounded-lg">
              <h2 className="text-xl font-semibold text-white">No Events Found</h2>
              <p className="text-gray-400 mt-2 mb-6">
                You haven&apos;t created any events yet. Get started now!
              </p>
              <Link href="/create">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Your First Event
                </Button>
              </Link>
            </div>
          )}
      </div>
    </div>
  );
} 