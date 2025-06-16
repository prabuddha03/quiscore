"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Team, Criteria, Score } from "@prisma/client";

type CriteriaWithScores = Criteria & { scores: Score[] };
type TeamWithScores = Team & { scores: Score[] };

interface GeneralScoreMatrixProps {
    teams: TeamWithScores[];
    criteria: CriteriaWithScores[];
}

export function GeneralScoreMatrix({ teams, criteria }: GeneralScoreMatrixProps) {
    const getScore = (teamId: string, criteriaId: string) => {
        const criterion = criteria.find(c => c.id === criteriaId);
        if (!criterion) return null;
        const score = criterion.scores.find(s => s.teamId === teamId);
        return score || null;
    };

    const calculateTeamTotal = (teamId: string) => {
        return criteria.reduce((total, c) => {
            const score = getScore(teamId, c.id);
            return total + (score?.points || 0);
        }, 0);
    };

    return (
        <div className="mt-6">
            <h4 className="text-lg font-semibold text-gray-200 mb-4">Score Matrix</h4>
            <div className="border rounded-lg border-gray-700 overflow-hidden">
                <Table className="bg-gray-900/50 text-white">
                    <TableHeader>
                        <TableRow className="border-gray-700 hover:bg-gray-800/50">
                            <TableHead className="font-semibold text-gray-300">Team</TableHead>
                            {criteria.map((c) => (
                                <TableHead key={c.id} className="text-center font-semibold text-gray-300">
                                    {c.name}
                                    {c.maxPoints && <span className="text-xs text-gray-500 ml-1">({c.maxPoints})</span>}
                                </TableHead>
                            ))}
                            <TableHead className="text-right font-semibold text-orange-400">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {teams.map((team) => (
                            <TableRow key={team.id} className="border-gray-800 hover:bg-gray-800/50">
                                <TableCell className="font-medium">{team.name}</TableCell>
                                {criteria.map((c) => {
                                    const score = getScore(team.id, c.id);
                                    return (
                                        <TableCell key={c.id} className="text-center">
                                            {score ? (
                                                <Badge variant="secondary" className="text-base">
                                                    {score.points}
                                                </Badge>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </TableCell>
                                    );
                                })}
                                <TableCell className="text-right font-bold text-lg text-orange-400">
                                    {calculateTeamTotal(team.id)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
             {criteria.length === 0 && <p className="text-center text-gray-500 py-8">No criteria defined for this round yet.</p>}
        </div>
    );
} 