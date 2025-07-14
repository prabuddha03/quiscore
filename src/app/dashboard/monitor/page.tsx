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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  Database, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  TrendingUp,
  Clock,
  Zap,
  HardDrive,
  Globe
} from "lucide-react";
import { useAuthModal } from "@/context/AuthModalContext";

interface SystemStats {
  timestamp: string;
  cache: {
    totalCachedEvents: number;
    totalSubscribers: number;
    cacheHitRate: number;
    avgSubscribersPerEvent: number;
    memoryUsage: number;
  };
  database: {
    events: number;
    teams: number;
    scores: number;
    avgScoresPerTeam: number;
  };
  connectionPool: {
    activeConnections: number;
    totalConnections: number;
    queuedRequests: number;
    completedRequests: number;
    failedRequests: number;
  };
  system: {
    memory: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
    uptime: number;
    nodeVersion: string;
    platform: string;
  };
  performance: {
    cacheEfficiency: number;
    averageSubscribersPerEvent: number;
    scalabilityMetrics: {
      maxConcurrentEvents: number;
      maxSubscribersPerEvent: number;
      currentEventLoad: number;
      currentSubscriberLoad: number;
    };
  };
  activeEvents: Array<{
    eventId: string;
    eventName: string;
    subscriberCount: number;
    lastActivity: string;
    connectionTypes: { sse: number; polling: number };
  }>;
  alerts: Array<{
    level: 'warning' | 'error' | 'info';
    message: string;
    metric: string;
    value: number;
  }>;
  recommendations: string[];
}

export default function MonitorPage() {
  const { status } = useSession();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { openSignInModal } = useAuthModal();

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setError(null);
      } else {
        setError("Failed to fetch system statistics");
      }
    } catch (err) {
      setError("Error connecting to monitoring API");
      console.error("Monitor fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (autoRefresh && status === 'authenticated') {
      const interval = setInterval(fetchStats, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, status]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getLoadColor = (load: number): string => {
    if (load > 0.9) return "text-red-500";
    if (load > 0.8) return "text-orange-500";
    if (load > 0.6) return "text-yellow-500";
    return "text-green-500";
  };

  const getLoadBadgeVariant = (load: number): "default" | "secondary" | "destructive" => {
    if (load > 0.8) return "destructive";
    if (load > 0.6) return "secondary";
    return "default";
  };

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
        <p className="text-gray-400 mb-8">You must be signed in to view system monitoring.</p>
        <Button onClick={openSignInModal} className="bg-orange-500 hover:bg-orange-600 text-white">Sign In</Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black min-h-screen text-white">
        <div className="container mx-auto py-10 px-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">System Monitor</h1>
            <Button onClick={fetchStats} className="bg-orange-500 hover:bg-orange-600 text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
          <Card className="bg-gray-900/50 border-red-500/20 text-white">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-300">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-black min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Data Available</h2>
          <Button onClick={fetchStats} className="bg-orange-500 hover:bg-orange-600 text-white">
            <RefreshCw className="h-4 w-4 mr-2" />
            Load Data
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white">
      <div className="container mx-auto py-10 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">System Monitor</h1>
            <p className="text-gray-400">
              Last updated: {new Date(stats.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Activity className="h-4 w-4 mr-2" />
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
            <Button onClick={fetchStats} className="bg-orange-500 hover:bg-orange-600 text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {stats.alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
              Active Alerts
            </h2>
            <div className="grid gap-4">
              {stats.alerts.map((alert, index) => (
                <Card key={index} className="bg-gray-900/50 border-orange-500/20 text-white">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                        <span>{alert.message}</span>
                      </div>
                      <Badge variant="destructive">
                        {(alert.value * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-white/10 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                Active Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cache.totalCachedEvents}</div>
              <div className="text-xs text-gray-400">
                Max: {stats.performance.scalabilityMetrics.maxConcurrentEvents}
              </div>
              <Badge 
                variant={getLoadBadgeVariant(stats.performance.scalabilityMetrics.currentEventLoad)}
                className="mt-2"
              >
                {(stats.performance.scalabilityMetrics.currentEventLoad * 100).toFixed(1)}% Load
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-white/10 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Total Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cache.totalSubscribers}</div>
              <div className="text-xs text-gray-400">
                Avg per event: {stats.performance.averageSubscribersPerEvent.toFixed(1)}
              </div>
              <Badge 
                variant={getLoadBadgeVariant(stats.performance.scalabilityMetrics.currentSubscriberLoad)}
                className="mt-2"
              >
                {(stats.performance.scalabilityMetrics.currentSubscriberLoad * 100).toFixed(1)}% Load
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-white/10 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                Cache Hit Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.cache.cacheHitRate * 100).toFixed(1)}%</div>
              <div className="text-xs text-gray-400">
                Higher is better
              </div>
              <Badge 
                variant={stats.cache.cacheHitRate > 0.8 ? "default" : "secondary"}
                className="mt-2"
              >
                {stats.cache.cacheHitRate > 0.8 ? "Excellent" : "Good"}
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-white/10 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                System Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUptime(stats.system.uptime)}</div>
              <div className="text-xs text-gray-400">
                {stats.system.platform} • {stats.system.nodeVersion}
              </div>
              <Badge variant="default" className="mt-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Healthy
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <HardDrive className="h-5 w-5 mr-2" />
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Heap Used</span>
                  <span className="text-sm font-mono">{formatBytes(stats.system.memory.heapUsed)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Heap Total</span>
                  <span className="text-sm font-mono">{formatBytes(stats.system.memory.heapTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">RSS</span>
                  <span className="text-sm font-mono">{formatBytes(stats.system.memory.rss)}</span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Usage</span>
                    <span className={`text-sm font-mono ${getLoadColor(stats.system.memory.heapUsed / (512 * 1024 * 1024))}`}>
                      {((stats.system.memory.heapUsed / (512 * 1024 * 1024)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Database Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Connections</span>
                  <span className="text-sm font-mono">
                    {stats.connectionPool.activeConnections} / {stats.connectionPool.totalConnections}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Queued Requests</span>
                  <span className="text-sm font-mono">{stats.connectionPool.queuedRequests}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completed Requests</span>
                  <span className="text-sm font-mono">{stats.connectionPool.completedRequests}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Failed Requests</span>
                  <span className="text-sm font-mono text-red-400">{stats.connectionPool.failedRequests}</span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold">{stats.database.events}</div>
                      <div className="text-xs text-gray-400">Events</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{stats.database.teams}</div>
                      <div className="text-xs text-gray-400">Teams</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{stats.database.scores}</div>
                      <div className="text-xs text-gray-400">Scores</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Events */}
        <Card className="bg-gray-900/50 border-white/10 text-white mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Active Events
            </CardTitle>
            <CardDescription>Real-time subscriber information</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.activeEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No active events with subscribers
              </div>
            ) : (
              <div className="space-y-4">
                {stats.activeEvents.map((event) => (
                  <div key={event.eventId} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                      <div className="font-medium">{event.eventName}</div>
                      <div className="text-sm text-gray-400">
                        Last activity: {new Date(event.lastActivity).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-400">{event.connectionTypes.sse}</div>
                        <div className="text-xs text-gray-400">SSE</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-400">{event.connectionTypes.polling}</div>
                        <div className="text-xs text-gray-400">Polling</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{event.subscriberCount}</div>
                        <div className="text-xs text-gray-400">Total</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        {stats.recommendations.length > 0 && (
          <Card className="bg-gray-900/50 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {stats.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-400" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 