"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Team, Score, Prisma } from "@prisma/client";
import { motion } from 'framer-motion';

type TeamWithScores = Omit<Team, 'players'> & { scores: Score[]; players: Prisma.JsonValue };

interface LiveScoreboardProps {
    teams: TeamWithScores[];
}

export function LiveScoreboard({ teams }: LiveScoreboardProps) {
    const calculateTotalScore = (team: TeamWithScores) => {
        return team.scores.reduce((total, score) => total + score.points, 0);
    };

    const sortedTeams = [...teams].sort((a, b) => {
        const scoreA = calculateTotalScore(a);
        const scoreB = calculateTotalScore(b);
        return scoreB - scoreA;
    });

    return (
        <Card className="bg-gray-900/50 border-white/10">
            <CardHeader>
                <CardTitle className="text-white">Live Scoreboard</CardTitle>
            </CardHeader>
            <CardContent>
                {teams.length > 0 ? (
                    <motion.div layout className="space-y-2">
                        {sortedTeams.map((team) => (
                             <motion.div layout key={team.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <div className="flex justify-between items-center p-3 bg-gray-800/60 rounded-lg">
                                    <p className="font-medium text-gray-200">{team.name}</p>
                                    <p className="text-xl font-bold text-orange-400">{calculateTotalScore(team)}</p>
                                </div>
                             </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <p className="text-gray-500">No teams available to display.</p>
                )}
            </CardContent>
        </Card>
    );
} 