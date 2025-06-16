"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Event, Team, Score, Round, Question } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, AlertTriangle, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ComparisonModal } from "@/components/ComparisonModal";

// Type definitions from scoreboard page
type QuestionWithScores = Question & { scores: Score[] };
type RoundWithQuestions = Round & { questions: QuestionWithScores[] };
type TeamWithScores = Team & { scores: Score[] };
type EventWithRelations = Event & {
  teams: TeamWithScores[];
  rounds: RoundWithQuestions[];
};

type RoundRules = {
  pounce?: boolean;
  scoring?: {
    pounceRight?: number;
  };
};

// Main Component
export default function TeamAnalysisPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>;
}) {
  const { id: eventId, teamId } = use(params);
  const [event, setEvent] = useState<EventWithRelations | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/event/${eventId}`);
    if (res.ok) {
      const data = await res.json();
      setEvent(data);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [fetchEvent, eventId]);

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading Analysis...
      </div>
    );
  }

  const targetTeam = event.teams.find((t) => t.id === teamId);
 //const otherTeams = event.teams.filter((t) => t.id !== teamId);

  if (!targetTeam) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Team not found.
      </div>
    );
  }

  // --- Analysis Logic ---

  const calculateTotalScore = (scores: Score[]) => {
    return scores.reduce((total, score) => total + score.points, 0);
  };

  const pounceMistakes = event.rounds
    .flatMap(round => 
      round.questions.map(question => {
        const score = question.scores.find(s => s.teamId === teamId);
        return { round, question, score };
      })
    )
    .filter(({ score }) => score && score.points < 0 && score.method && score.method.toLowerCase().includes('pounce'))
    .map(({ round, question, score }) => ({
        roundName: round.name,
        questionNumber: question.number,
        pointsLost: score!.points,
    }));

  const totalPointsLost = pounceMistakes.reduce((acc, mistake) => acc - mistake.pointsLost, 0);
  const actualScore = calculateTotalScore(targetTeam.scores);
  const hypotheticalScore = actualScore + totalPointsLost;

  const allTeamsScores = event.teams.map(team => ({
    id: team.id,
    name: team.name,
    score: calculateTotalScore(team.scores),
  }));

  const sortedActualTeams = [...allTeamsScores].sort((a, b) => b.score - a.score);
  const actualRank = sortedActualTeams.findIndex(t => t.id === teamId) + 1;

  const hypotheticalTeamScores = allTeamsScores.map(t => 
    t.id === teamId ? { ...t, score: hypotheticalScore } : t
  );
  const sortedHypotheticalTeams = [...hypotheticalTeamScores].sort((a, b) => b.score - a.score);
  const hypotheticalRank = sortedHypotheticalTeams.findIndex(t => t.id === teamId) + 1;
  
  const rankChange = actualRank - hypotheticalRank;

  const chartData = event.rounds.map(round => {
    const roundScores = targetTeam.scores.filter(s => {
        const question = event.rounds.flatMap(r => r.questions).find(q => q.id === s.questionId);
        return question?.roundId === round.id;
    });
    const actualRoundScore = calculateTotalScore(roundScores);

    const roundMistakes = pounceMistakes.filter(m => m.roundName === round.name);
    const pointsLostInRound = roundMistakes.reduce((acc, m) => acc - m.pointsLost, 0);
    const hypotheticalRoundScore = actualRoundScore + pointsLostInRound;

    return {
        name: round.name,
        'Actual Score': actualRoundScore,
        'Hypothetical Score': hypotheticalRoundScore,
    }
  });
  
  const getVerdict = () => {
    if (rankChange <= 0) {
      return {
        title: "Close, But No Rank Change",
        description: `Even without the ${pounceMistakes.length} pounce mistakes, your final rank would have remained #${actualRank}. Keep refining that pounce strategy!`,
        color: "text-gray-400",
      };
    }
    if (hypotheticalRank === 1) {
      return {
        title: "Victory Was Within Reach!",
        description: `Without the ${pounceMistakes.length} pounce mistakes costing you ${totalPointsLost} points, you would have finished in 1st place!`,
        color: "text-yellow-400",
      };
    }
    return {
      title: `You would have climbed ${rankChange} rank(s)!`,
      description: `Avoiding the ${pounceMistakes.length} pounce mistakes would have moved you from rank #${actualRank} to #${hypotheticalRank}.`,
      color: "text-green-400",
    };
  };

  // --- Aggressive Pounce Analysis ---
  let pounceOpportunity: {
    targetRank: number;
    targetTeamName: string;
    scoreDifference: number;
    pouncesNeeded: number;
  } | null = null;

  if (actualRank > 1) {
    const unansweredQuestions = event.rounds.flatMap(round => {
      const rules = round.rules as RoundRules;
      // Check if pounce is enabled for the round
      if (!rules.pounce) {
        return [];
      }
      const pounceCorrectPoints = rules.scoring?.pounceRight;
      if (typeof pounceCorrectPoints !== 'number' || pounceCorrectPoints <= 0) {
        return [];
      }

      const answeredQuestionIds = new Set(targetTeam.scores.map(s => s.questionId));
      return round.questions
        .filter(q => !answeredQuestionIds.has(q.id))
        .map(q => ({
          questionId: q.id,
          potentialGain: pounceCorrectPoints,
        }));
    }).sort((a, b) => b.potentialGain - a.potentialGain);
    
    const targetRankIndex = actualRank - 2; // -1 for 0-index, -1 for team above
    const targetTeamToBeat = sortedActualTeams[targetRankIndex];

    if (targetTeamToBeat && unansweredQuestions.length > 0) {
      const scoreDifference = targetTeamToBeat.score - actualScore;
      let pointsToGain = scoreDifference + 1;
      let pouncesNeeded = 0;
      
      for (const opportunity of unansweredQuestions) {
        if (pointsToGain <= 0) break;
        pointsToGain -= opportunity.potentialGain;
        pouncesNeeded++;
      }
      
      if (pointsToGain <= 0) {
        pounceOpportunity = {
          targetRank: actualRank - 1,
          targetTeamName: targetTeamToBeat.name,
          scoreDifference: scoreDifference,
          pouncesNeeded: pouncesNeeded,
        };
      }
    }
  }

  const verdict = getVerdict();

  return (
    <div className="bg-black min-h-screen text-white">
      <div className="container mx-auto py-8 px-4">
        <Link href={`/event/${eventId}/scoreboard`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scoreboard
          </Button>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            Performance Analysis
          </h1>
          <p className="text-2xl text-orange-400">{targetTeam.name}</p>
          <div className="mt-4">
            <Button onClick={() => setIsModalOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Compare with others
            </Button>
          </div>
        </div>

        {/* --- Analysis UI --- */}
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gray-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle>Actual Performance</CardTitle>
                        <CardDescription>Your final result in the quiz.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{actualScore} pts</p>
                        <p className="text-lg text-gray-400">Rank #{actualRank}</p>
                    </CardContent>
                </Card>
                <Card className="bg-orange-900/20 border-orange-500/50">
                    <CardHeader>
                        <CardTitle className="flex items-center"><AlertTriangle className="h-5 w-5 mr-2 text-orange-400"/>Pounce Analysis</CardTitle>
                        <CardDescription>Impact of incorrect pounces.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-orange-400">-{totalPointsLost} pts</p>
                        <p className="text-lg text-gray-400">{pounceMistakes.length} costly mistakes</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-900/20 border-green-500/50">
                    <CardHeader>
                        <CardTitle>What-If Scenario</CardTitle>
                        <CardDescription>Your potential result without mistakes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-green-400">{hypotheticalScore} pts</p>
                        <p className="text-lg text-gray-400">Potential Rank #{hypotheticalRank}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Verdict */}
            <Card className="bg-gray-900/50 border-white/10 text-center">
                <CardHeader>
                    <CardTitle className={verdict.color}>{verdict.title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg text-gray-300">{verdict.description}</p>
                </CardContent>
            </Card>

            {/* Path to Higher Rank Card */}
            {pounceOpportunity && (
              <Card className="bg-blue-900/20 border-blue-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-400">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Path to Rank #{pounceOpportunity.targetRank}
                  </CardTitle>
                  <CardDescription>
                    An aggressive pounce strategy could improve your standing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                   <p className="text-lg text-gray-300">
                    You were <span className="font-bold text-white">{pounceOpportunity.scoreDifference + 1}</span> points behind <span className="font-bold text-white">{pounceOpportunity.targetTeamName}</span>.
                   </p>
                   <p className="mt-2 text-2xl font-bold text-blue-300">
                     Answering <span className="text-white">{pounceOpportunity.pouncesNeeded}</span> unanswered question(s) correctly via pounce could have secured you the next rank.
                   </p>
                </CardContent>
              </Card>
            )}

            {/* Round-by-Round Chart */}
            {event.rounds.length > 0 && (
            <Card className="bg-gray-900/50 border-white/10">
                <CardHeader>
                    <CardTitle>Round Performance</CardTitle>
                    <CardDescription>Your score in each round vs. your potential score.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart 
                            data={chartData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.9}/>
                                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.5}/>
                                </linearGradient>
                                <linearGradient id="colorHypothetical" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9}/>
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.5}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis dataKey="name" stroke="#888888" />
                            <YAxis stroke="#888888" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "rgba(30, 41, 59, 0.9)",
                                    borderColor: "rgba(255, 255, 255, 0.2)",
                                }}
                                cursor={{fill: 'rgba(100, 116, 139, 0.1)'}}
                            />
                            <Legend />
                            <Bar dataKey="Actual Score" fill="url(#colorActual)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Hypothetical Score" fill="url(#colorHypothetical)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            )}

            {/* Pounce Mistakes Table */}
            {pounceMistakes.length > 0 && (
            <Card className="bg-gray-900/50 border-white/10">
                <CardHeader>
                    <CardTitle>Detailed Pounce Mistakes</CardTitle>
                    <CardDescription>A list of questions where pounces resulted in negative scores.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/10">
                                <TableHead className="text-white">Round</TableHead>
                                <TableHead className="text-white">Question #</TableHead>
                                <TableHead className="text-white text-right">Points Lost</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pounceMistakes.map((mistake, index) => (
                                <TableRow key={index} className="border-white/10">
                                    <TableCell>{mistake.roundName}</TableCell>
                                    <TableCell>{mistake.questionNumber}</TableCell>
                                    <TableCell className="text-right text-red-500 font-medium">{mistake.pointsLost}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            )}
        </div>
      </div>
      <ComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetTeam={targetTeam}
        event={event}
      />
    </div>
  );
} 