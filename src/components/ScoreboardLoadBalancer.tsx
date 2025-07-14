"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RealTimeScoreboard } from "./RealTimeScoreboard";
import { Users, Wifi, RefreshCw } from "lucide-react";

interface ScoreboardLoadBalancerProps {
  eventId: string;
  className?: string;
}

export function ScoreboardLoadBalancer({ eventId, className }: ScoreboardLoadBalancerProps) {
  const [viewerCount, setViewerCount] = useState(0);
  const [sseViewers, setSseViewers] = useState(0);
  const [pollingViewers, setPollingViewers] = useState(0);
  const [isAtCapacity, setIsAtCapacity] = useState(false);

  // Simulate viewer count (in real app, this would come from server)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate fluctuating viewer count
      const newCount = Math.floor(Math.random() * 150) + 50; // 50-200 viewers
      setViewerCount(newCount);
      
      // SSE can handle 100 viewers, rest go to polling
      const maxSSE = 100;
      const sseCount = Math.min(newCount, maxSSE);
      const pollingCount = Math.max(0, newCount - maxSSE);
      
      setSseViewers(sseCount);
      setPollingViewers(pollingCount);
      setIsAtCapacity(newCount > maxSSE);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (count: number, max: number) => {
    const percentage = count / max;
    if (percentage < 0.7) return "text-green-400";
    if (percentage < 0.9) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Load Balancer Status */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Scoreboard Load Balancer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={isAtCapacity ? "destructive" : "default"}>
                {isAtCapacity ? "At Capacity" : "Available"}
              </Badge>
              <span className="text-sm text-gray-400">
                {viewerCount} total viewers
              </span>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Connection Distribution */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-800/60 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">SSE Connections</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${getStatusColor(sseViewers, 100)}`}>
                  {sseViewers}
                </span>
                <span className="text-sm text-gray-400">/ 100 max</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((sseViewers / 100) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="p-3 bg-gray-800/60 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">HTTP Polling</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${getStatusColor(pollingViewers, 1000)}`}>
                  {pollingViewers}
                </span>
                <span className="text-sm text-gray-400">/ 1000 max</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((pollingViewers / 1000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Capacity Alert */}
          {isAtCapacity && (
            <div className="p-3 bg-yellow-900/20 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-400">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-sm">
                  SSE at capacity ({sseViewers}/100). New viewers automatically use HTTP polling.
                </span>
              </div>
            </div>
          )}

          {/* Performance Info */}
          <div className="text-xs text-gray-500 grid grid-cols-2 gap-4">
            <div>
              <strong>SSE:</strong> Instant updates, higher memory usage
            </div>
            <div>
              <strong>Polling:</strong> 10-second delays, lower memory usage
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actual Scoreboard */}
      <RealTimeScoreboard eventId={eventId} className="max-w-4xl mx-auto" />
    </div>
  );
} 