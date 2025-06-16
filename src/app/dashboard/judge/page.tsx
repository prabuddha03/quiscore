"use client";

import { useState, useEffect } from "react";
import { Event, Judge, Round, Team } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

type EventWithDetails = Event & {
    judges: Judge[];
    rounds: Round[];
    teams: Team[];
};

export default function JudgeDashboardPage() {
    const { data: session, status } = useSession();
    const [events, setEvents] = useState<EventWithDetails[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "authenticated") {
            const fetchEvents = async () => {
                setLoading(true);
                const res = await fetch("/api/judge/events");
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data);
                } else {
                    console.error("Failed to fetch judge events");
                }
                setLoading(false);
            };
            fetchEvents();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status]);

    if (loading) {
        return <div className="text-center p-10">Loading dashboard...</div>;
    }

    if (status === "unauthenticated") {
        return <div className="text-center p-10">Please sign in to view your dashboard.</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-4xl font-bold text-white mb-2">Judge Dashboard</h1>
            <p className="text-lg text-gray-400 mb-8">Events you have been invited to judge.</p>

            {events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => (
                        <Card key={event.id} className="bg-gray-900/50 border-white/10 text-white flex flex-col justify-between">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    {event.name}
                                    <Badge variant="outline" className="border-orange-400 text-orange-400">{event.type}</Badge>
                                </CardTitle>
                                <CardDescription>
                                    {event.rounds.length} rounds, {event.teams.length} teams
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href={`/event/${event.id}/judge`} legacyBehavior>
                                    <a className="flex items-center justify-center w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-2 px-4 rounded">
                                        Open Judging Panel <ExternalLink className="ml-2 h-4 w-4"/>
                                    </a>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-900/50 rounded-lg">
                    <h2 className="text-2xl font-semibold text-white">No Events Found</h2>
                    <p className="text-gray-400 mt-2">You have not been assigned to judge any events yet.</p>
                </div>
            )}
        </div>
    );
} 