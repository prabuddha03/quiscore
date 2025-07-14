"use client";

import { useScoreboardSSE } from "@/hooks/use-scoreboard-sse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Wifi, WifiOff, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RealTimeScoreboardProps {
  eventId: string;
  className?: string;
}

export function RealTimeScoreboard({ eventId, className }: RealTimeScoreboardProps) {
  const {
    scoreboard,
    isConnected,
    connectionType,
    isLoading,
    error,
    lastUpdateTime,
    refresh,
  } = useScoreboardSSE({ eventId });

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return "Never";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  if (isLoading && !scoreboard) {
    return (
      <Card className={`bg-gray-900/50 border-white/10 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white">Loading Scoreboard...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-800/60 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !scoreboard) {
    return (
      <Card className={`bg-gray-900/50 border-white/10 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white">Error Loading Scoreboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-red-400">{error}</p>
            <Button onClick={refresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gray-900/50 border-white/10 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Live Scoreboard</CardTitle>
          
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                {isConnected ? (
                  connectionType === 'sse' ? 'Live SSE' : 'Live Polling'
                ) : 'Disconnected'}
              </Badge>
            </div>

            {/* Last Update Time */}
            {lastUpdateTime && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {formatLastUpdate(lastUpdateTime)}
              </div>
            )}

            {/* Manual Refresh Button */}
            <Button
              onClick={refresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {scoreboard?.teams && scoreboard.teams.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <motion.div layout className="space-y-2">
              {scoreboard.teams.map((team, index) => (
                <motion.div
                  layout
                  key={team.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex justify-between items-center p-4 bg-gray-800/60 rounded-lg hover:bg-gray-800/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <Badge 
                      variant={index === 0 ? "default" : "secondary"} 
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? "bg-yellow-500 text-black" : 
                        index === 1 ? "bg-gray-400 text-black" :
                        index === 2 ? "bg-amber-600 text-black" : ""
                      }`}
                    >
                      {index + 1}
                    </Badge>

                    {/* Team Info */}
                    <div>
                      <p className="font-medium text-gray-200">{team.name}</p>
                      {team.scoresCount > 0 && (
                        <p className="text-xs text-gray-400">
                          {team.scoresCount} score{team.scoresCount !== 1 ? 's' : ''} submitted
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <motion.div
                    key={team.totalScore} // This will trigger animation when score changes
                    initial={{ scale: 1.2, color: "#f59e0b" }}
                    animate={{ scale: 1, color: "#fb923c" }}
                    transition={{ duration: 0.5 }}
                    className="text-2xl font-bold text-orange-400"
                  >
                    {team.totalScore}
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No teams found or no scores submitted yet.</p>
          </div>
        )}

        {/* Scoreboard Info */}
        {scoreboard && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Event ID: {scoreboard.eventId}</span>
              <span>
                Last updated: {scoreboard.lastUpdated ? 
                  new Date(scoreboard.lastUpdated).toLocaleTimeString() : 
                  "Unknown"
                }
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 