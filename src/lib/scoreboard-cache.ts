/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from './prisma';
import { dbUtils } from './connection-pool';

type ScoreboardData = {
  teams: Array<{
    id: string;
    name: string;
    scores?: Array<{ points: number }>;
    totalScore?: number;
    scoresCount?: number;
  }>;
  lastUpdated: string;
  eventId: string;
};

// Enhanced cache with resource management for high-scale scenarios
class ScoreboardCache {
  private cache = new Map<string, {
    data: ScoreboardData | null;
    timestamp: number;
    subscribers: Set<(data: ScoreboardData) => void>;
    lastAccessed: number;
  }>();

  // Configuration for high-scale scenarios
  private readonly CACHE_TTL = 30 * 1000; // 30 seconds
  private readonly MAX_CACHE_SIZE = 200; // Maximum 200 cached events
  private readonly MAX_SUBSCRIBERS_PER_EVENT = 100; // Limit subscribers per event
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Performance monitoring
  private stats = {
    totalCacheHits: 0,
    totalCacheMisses: 0,
    totalSubscribers: 0,
    peakCacheSize: 0,
    peakSubscribers: 0,
  };

  constructor() {
    // Enhanced cleanup with LRU eviction
    setInterval(() => {
      this.performMaintenance();
    }, this.CLEANUP_INTERVAL);
  }

  // Get cached scoreboard data with performance tracking
  get(eventId: string) {
    const cached = this.cache.get(eventId);
    if (!cached) {
      this.stats.totalCacheMisses++;
      return null;
    }
    
    // Check if cache is still valid
    const cacheAge = Date.now() - cached.timestamp;
    if (cacheAge > this.CACHE_TTL) {
      console.log(`🗑️ Cache expired for event ${eventId}`, {
        cacheAge: `${cacheAge}ms`,
        ttl: `${this.CACHE_TTL}ms`,
        cachedTime: new Date(cached.timestamp).toISOString(),
        currentTime: new Date().toISOString()
      });
      this.cache.delete(eventId);
      this.stats.totalCacheMisses++;
      return null;
    }

    // Update last accessed time for LRU
    cached.lastAccessed = Date.now();
    this.stats.totalCacheHits++;
    
    return cached.data;
  }

  // Set scoreboard data with resource management
  async set(eventId: string, data: any) {
    // Check cache size limits
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    const cached = this.cache.get(eventId);
    const subscribers = cached?.subscribers || new Set();

    // Update cache with access tracking
    this.cache.set(eventId, {
      data: {
        ...data,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      subscribers,
    });

    // Update peak stats
    this.stats.peakCacheSize = Math.max(this.stats.peakCacheSize, this.cache.size);

    // Notify subscribers (with error handling)
    let notifiedCount = 0;
    const failedSubscribers: Set<(data: any) => void> = new Set();

    subscribers.forEach(callback => {
      try {
        callback(data);
        notifiedCount++;
      } catch (error) {
        console.error('Error notifying SSE subscriber:', error);
        failedSubscribers.add(callback);
      }
    });

    // Remove failed subscribers
    failedSubscribers.forEach(subscriber => {
      subscribers.delete(subscriber);
    });

    console.log(`📊 Scoreboard cache updated for event ${eventId}, notified ${notifiedCount} subscribers`);
  }

  // Subscribe with connection limits and graceful degradation
  subscribe(eventId: string, callback: (data: ScoreboardData) => void): () => void {
    let cached = this.cache.get(eventId);
    
    if (!cached) {
      cached = {
        data: null,
        timestamp: 0,
        lastAccessed: Date.now(),
        subscribers: new Set(),
      };
      this.cache.set(eventId, cached);
    }

    // Check subscriber limits - but don't reject, just warn
    if (cached.subscribers.size >= this.MAX_SUBSCRIBERS_PER_EVENT) {
      console.warn(`⚠️ Max SSE subscribers reached for event ${eventId} (${cached.subscribers.size}). User should fall back to HTTP polling.`);
      
      // Instead of throwing error, return a dummy unsubscribe function
      // The client will handle the fallback to HTTP polling
      return () => {
        console.log(`📡 Polling user disconnected from event ${eventId}`);
      };
    }

    cached.subscribers.add(callback);
    this.stats.totalSubscribers++;
    this.stats.peakSubscribers = Math.max(this.stats.peakSubscribers, this.getTotalSubscribers());

    console.log(`📡 New SSE subscriber for event ${eventId}, total: ${cached.subscribers.size}`);

    // Return unsubscribe function
    return () => {
      cached?.subscribers.delete(callback);
      this.stats.totalSubscribers--;
      console.log(`📡 SSE subscriber removed for event ${eventId}, remaining: ${cached?.subscribers.size || 0}`);
      
      // Clean up empty cache entries
      if (cached?.subscribers.size === 0) {
        this.cache.delete(eventId);
      }
    };
  }

  // Optimized batch calculation for multiple events
  async calculateAndCacheBatch(eventIds: string[], forceRefresh = false): Promise<Record<string, ScoreboardData | null>> {
    const results: Record<string, ScoreboardData | null> = {};
    const eventsToFetch: string[] = [];

    // Check cache first
    if (!forceRefresh) {
      eventIds.forEach(eventId => {
        const cached = this.get(eventId);
        if (cached) {
          results[eventId] = cached;
        } else {
          eventsToFetch.push(eventId);
        }
      });
    } else {
      eventsToFetch.push(...eventIds);
    }

    // Batch fetch from database
    if (eventsToFetch.length > 0) {
      console.log(`🔄 Calculating scoreboard for ${eventsToFetch.length} events`);

      try {
        // Use connection pool for optimized batch query
        const scoreboardsData = await dbUtils.safeQuery(
          () => prisma.$queryRaw`
            SELECT 
              t."eventId",
              t.id,
              t.name,
              t."documentLink",
              COALESCE(SUM(s.points), 0)::integer as total_score,
              COUNT(DISTINCT s.id)::integer as scores_count,
              json_agg(
                json_build_object(
                  'points', s.points,
                  'criteriaId', s."criteriaId",
                  'pointers', s.pointers,
                  'judgeId', s."judgeId",
                  'questionId', s."questionId",
                  'method', s.method
                )
              ) FILTER (WHERE s.id IS NOT NULL) as scores
            FROM "Team" t
            LEFT JOIN "Score" s ON t.id = s."teamId"
            WHERE t."eventId" = ANY(${eventsToFetch})
            GROUP BY t."eventId", t.id, t.name, t."documentLink"
            ORDER BY t."eventId", total_score DESC, t.name ASC
          `,
          `scoreboard-batch-${eventsToFetch.length}`,
          3 // Max 3 retries
        );

        // Group by event
        const eventGroups: Record<string, any[]> = {};
        (scoreboardsData as any[]).forEach(team => {
          const eventId = team.eventId;
          if (!eventGroups[eventId]) {
            eventGroups[eventId] = [];
          }
          eventGroups[eventId].push({
            id: team.id,
            name: team.name,
            documentLink: team.documentlink,
            totalScore: team.total_score,
            scoresCount: team.scores_count,
            scores: team.scores || [],
          });
        });

        // Cache all results
        for (const eventId of eventsToFetch) {
          const formattedData = {
            teams: eventGroups[eventId] || [],
            lastUpdated: new Date().toISOString(),
            eventId,
          };

          await this.set(eventId, formattedData);
          results[eventId] = formattedData;
        }

      } catch (error) {
        console.error(`❌ Error calculating batch scoreboard:`, error);
        throw error;
      }
    }

    return results;
  }

  // Individual calculation (legacy support)
  async calculateAndCache(eventId: string, forceRefresh = false): Promise<any> {
    const results = await this.calculateAndCacheBatch([eventId], forceRefresh);
    return results[eventId];
  }

  // Enhanced maintenance with LRU eviction
  private performMaintenance() {
    const now = Date.now();
    let cleanedCount = 0;

    // Remove expired entries
    this.cache.forEach((cached, eventId) => {
      if (now - cached.timestamp > this.CACHE_TTL && cached.subscribers.size === 0) {
        this.cache.delete(eventId);
        cleanedCount++;
      }
    });

    // Force eviction if still over limit
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old cache entries`);
    }

    // Log performance stats
    console.log(`📊 Cache stats: ${this.cache.size} entries, ${this.getTotalSubscribers()} subscribers, ${this.stats.totalCacheHits} hits, ${this.stats.totalCacheMisses} misses`);
  }

  // LRU eviction when cache is full
  private evictLeastRecentlyUsed() {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toRemove = Math.floor(this.MAX_CACHE_SIZE * 0.1); // Remove 10% of entries
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      const [eventId, cached] = entries[i];
      if (cached.subscribers.size === 0) {
        this.cache.delete(eventId);
        console.log(`🗑️ Evicted LRU cache entry for event ${eventId}`);
      }
    }
  }

  // Get total subscribers across all events
  private getTotalSubscribers(): number {
    let total = 0;
    this.cache.forEach(cached => {
      total += cached.subscribers.size;
    });
    return total;
  }

  // Get comprehensive stats for monitoring
  getStats() {
    const currentStats = {
      totalCachedEvents: this.cache.size,
      totalSubscribers: this.getTotalSubscribers(),
      peakCacheSize: this.stats.peakCacheSize,
      peakSubscribers: this.stats.peakSubscribers,
      cacheHitRate: this.stats.totalCacheHits / (this.stats.totalCacheHits + this.stats.totalCacheMisses),
      cacheDetails: [] as Array<{
        eventId: string;
        subscriberCount: number;
        cacheAge: number;
        lastAccessed: number;
      }>,
    };

    this.cache.forEach((cached, eventId) => {
      currentStats.cacheDetails.push({
        eventId,
        subscriberCount: cached.subscribers.size,
        cacheAge: Date.now() - cached.timestamp,
        lastAccessed: cached.lastAccessed,
      });
    });

    return currentStats;
  }

  // Force cleanup of specific event
  evictEvent(eventId: string): boolean {
    const cached = this.cache.get(eventId);
    if (cached && cached.subscribers.size === 0) {
      this.cache.delete(eventId);
      console.log(`🗑️ Manually evicted cache for event ${eventId}`);
      return true;
    }
    return false;
  }

  // Get active events list
  getActiveEvents(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Export singleton instance
export const scoreboardCache = new ScoreboardCache(); 