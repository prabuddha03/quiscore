import { NextResponse } from 'next/server';
import { scoreboardCache } from '@/lib/scoreboard-cache';
import { prisma } from '@/lib/prisma';
import { connectionPool, dbUtils } from '@/lib/connection-pool';

export async function GET() {
  try {
    // Get cache statistics
    const cacheStats = scoreboardCache.getStats();
    
    // Get database statistics
    const dbStats = await getDatabaseStats();
    
    // Get connection pool statistics
    const connectionPoolStats = connectionPool.getStats();
    
    // Get system resource usage
    const systemStats = getSystemStats();
    
    // Get active events overview with detailed information
    const activeEvents = await getActiveEventsWithDetails();
    
    // Calculate performance metrics
    const performanceMetrics = {
      cacheEfficiency: cacheStats.cacheHitRate,
      averageSubscribersPerEvent: cacheStats.totalSubscribers / Math.max(cacheStats.totalCachedEvents, 1),
      systemLoad: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage(),
      },
      scalabilityMetrics: {
        maxConcurrentEvents: 200, // Based on cache limit
        maxSubscribersPerEvent: 100, // Based on connection limit
        currentEventLoad: cacheStats.totalCachedEvents / 200, // Percentage of capacity
        currentSubscriberLoad: cacheStats.totalSubscribers / (200 * 100), // Percentage of max capacity
      },
    };
    
    // Alert thresholds
    const alerts = [];
    if (performanceMetrics.scalabilityMetrics.currentEventLoad > 0.8) {
      alerts.push({
        level: 'warning',
        message: 'High event load detected (>80% capacity)',
        metric: 'currentEventLoad',
        value: performanceMetrics.scalabilityMetrics.currentEventLoad,
      });
    }
    
    if (performanceMetrics.scalabilityMetrics.currentSubscriberLoad > 0.8) {
      alerts.push({
        level: 'warning',
        message: 'High subscriber load detected (>80% capacity)',
        metric: 'currentSubscriberLoad',
        value: performanceMetrics.scalabilityMetrics.currentSubscriberLoad,
      });
    }
    
    if (cacheStats.cacheHitRate < 0.7) {
      alerts.push({
        level: 'warning',
        message: 'Low cache hit rate (<70%)',
        metric: 'cacheHitRate',
        value: cacheStats.cacheHitRate,
      });
    }
    
    const response = {
      timestamp: new Date().toISOString(),
      cache: cacheStats,
      database: dbStats,
      connectionPool: connectionPoolStats,
      system: systemStats,
      performance: performanceMetrics,
      activeEvents,
      alerts,
      recommendations: generateRecommendations(performanceMetrics, cacheStats),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}

async function getDatabaseStats() {
  try {
    const [eventCount, teamCount, scoreCount] = await Promise.all([
      dbUtils.safeQuery(() => prisma.event.count(), 'admin-stats'),
      dbUtils.safeQuery(() => prisma.team.count(), 'admin-stats'),
      dbUtils.safeQuery(() => prisma.score.count(), 'admin-stats'),
    ]);
    
    // Get database connection info (if available)
    const dbInfo = {
      events: eventCount,
      teams: teamCount,
      scores: scoreCount,
      avgScoresPerTeam: teamCount > 0 ? scoreCount / teamCount : 0,
    };
    
    return dbInfo;
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {
      events: 0,
      teams: 0,
      scores: 0,
      avgScoresPerTeam: 0,
      error: 'Failed to fetch database statistics',
    };
  }
}

function getSystemStats() {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    memory: {
      rss: memoryUsage.rss,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

function generateRecommendations(
  performanceMetrics: {
    scalabilityMetrics: {
      currentEventLoad: number;
      currentSubscriberLoad: number;
    };
    systemLoad: {
      memoryUsage: {
        heapUsed: number;
      };
    };
  },
  cacheStats: {
    cacheHitRate: number;
    totalCachedEvents: number;
  },
  //alerts: Array<{ level: string; message: string; metric: string; value: number }>
): string[] {
  const recommendations = [];
  
  // High load recommendations
  if (performanceMetrics.scalabilityMetrics.currentEventLoad > 0.8) {
    recommendations.push(
      'Consider implementing event cleanup for inactive events',
      'Monitor event activity and remove stale cache entries',
      'Consider horizontal scaling if sustained high load'
    );
  }
  
  // High subscriber load recommendations
  if (performanceMetrics.scalabilityMetrics.currentSubscriberLoad > 0.8) {
    recommendations.push(
      'Monitor for websocket connection leaks',
      'Consider implementing connection pooling',
      'Review subscriber cleanup mechanisms'
    );
  }
  
  // Low cache hit rate recommendations
  if (cacheStats.cacheHitRate < 0.7) {
    recommendations.push(
      'Increase cache TTL if score updates are infrequent',
      'Review cache invalidation strategy',
      'Consider pre-warming cache for popular events'
    );
  }
  
  // Memory usage recommendations
  const memoryUsageGB = performanceMetrics.systemLoad.memoryUsage.heapUsed / (1024 * 1024 * 1024);
  if (memoryUsageGB > 0.4) { // 400MB threshold for 512MB server
    recommendations.push(
      'Memory usage is high - consider implementing more aggressive cache cleanup',
      'Monitor for memory leaks in SSE connections',
      'Consider implementing connection limits per IP'
    );
  }
  
  // Performance optimization recommendations
  if (cacheStats.totalCachedEvents > 50) {
    recommendations.push(
      'High number of cached events - ensure proper cleanup',
      'Consider implementing event-specific cache timeouts',
      'Monitor database query performance'
    );
  }
  
  return recommendations;
}

async function getActiveEventsWithDetails() {
  try {
    const cacheStats = scoreboardCache.getStats();
    const activeEvents = [];
    
    // Get event names from database for cached events
    const eventIds = cacheStats.cacheDetails.map(detail => detail.eventId);
    
    if (eventIds.length === 0) {
      return [];
    }
    
    const events = await dbUtils.safeQuery(
      () => prisma.event.findMany({
        where: { id: { in: eventIds } },
        select: { id: true, name: true }
      }),
      'admin-stats-events'
    );
    
    // Create a map for quick lookup
    const eventNameMap = new Map(events.map(event => [event.id, event.name]));
    
    // Transform cache details into expected format
    for (const detail of cacheStats.cacheDetails) {
      activeEvents.push({
        eventId: detail.eventId,
        eventName: eventNameMap.get(detail.eventId) || `Event ${detail.eventId}`,
        subscriberCount: detail.subscriberCount,
        lastActivity: new Date(detail.lastAccessed).toISOString(),
        connectionTypes: {
          sse: detail.subscriberCount, // All subscribers are SSE in the cache
          polling: 0 // No polling tracked in cache
        }
      });
    }
    
    return activeEvents;
  } catch (error) {
    console.error('Error getting active events with details:', error);
    return [];
  }
} 