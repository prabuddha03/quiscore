"use client";

import { useEffect, useState } from "react";
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

export default function DashboardPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!session?.user?.email) return;
      
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
    };

    fetchEvents();
  }, [session]);

  if (!session) {
    return <div>Please sign in to view your dashboard.</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>My Events</CardTitle>
          <CardDescription>
            Manage all events you've created
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{event.name}</CardTitle>
                  <CardDescription>
                    Created: {new Date(event.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Link href={`/event/${event.id}/admin`}>
                      <Button className="w-full">Manage Event</Button>
                    </Link>
                    <Link href={`/event/${event.id}/scoreboard`}>
                      <Button variant="outline" className="w-full">
                        View Scoreboard
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {events.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You haven't created any events yet.
              </p>
              <Link href="/create">
                <Button>Create Your First Event</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 