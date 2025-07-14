import { PrismaClient } from '@prisma/client';

// Connection pool configuration for high-scale scenarios
const CONNECTION_POOL_CONFIG = {
  // Database connection limits
  MAX_CONNECTIONS: 20, // Maximum concurrent database connections
  MIN_CONNECTIONS: 2,  // Minimum connections to maintain
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  IDLE_TIMEOUT: 60000, // 1 minute
  
  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 1000, // Maximum requests per minute per IP
  MAX_CONCURRENT_REQUESTS: 100, // Maximum concurrent requests
  
  // Query optimization
  QUERY_TIMEOUT: 10000, // 10 seconds for individual queries
  BATCH_SIZE: 50, // Maximum batch size for bulk operations
};

// Rate limiting store
class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number; }>();
  private concurrentRequests = new Map<string, number>();
  private globalConcurrentRequests = 0;

  // Check if request is allowed
  isAllowed(identifier: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    
    // Check global concurrent requests
    if (this.globalConcurrentRequests >= CONNECTION_POOL_CONFIG.MAX_CONCURRENT_REQUESTS) {
      return { allowed: false, reason: 'Global concurrent request limit exceeded' };
    }
    
    // Check per-IP concurrent requests
    const currentConcurrent = this.concurrentRequests.get(identifier) || 0;
    if (currentConcurrent >= 10) { // Max 10 concurrent requests per IP
      return { allowed: false, reason: 'IP concurrent request limit exceeded' };
    }
    
    // Check rate limit
    const requestData = this.requests.get(identifier);
    if (!requestData || now > requestData.resetTime) {
      // Reset or create new window
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + 60000, // 1 minute window
      });
      return { allowed: true };
    }
    
    if (requestData.count >= CONNECTION_POOL_CONFIG.MAX_REQUESTS_PER_MINUTE) {
      return { allowed: false, reason: 'Rate limit exceeded' };
    }
    
    requestData.count++;
    return { allowed: true };
  }
  
  // Track request start
  trackRequestStart(identifier: string): void {
    const current = this.concurrentRequests.get(identifier) || 0;
    this.concurrentRequests.set(identifier, current + 1);
    this.globalConcurrentRequests++;
  }
  
  // Track request end
  trackRequestEnd(identifier: string): void {
    const current = this.concurrentRequests.get(identifier) || 0;
    if (current > 0) {
      this.concurrentRequests.set(identifier, current - 1);
    }
    
    if (this.globalConcurrentRequests > 0) {
      this.globalConcurrentRequests--;
    }
  }
  
  // Get current stats
  getStats() {
    return {
      totalActiveRequests: this.globalConcurrentRequests,
      activeIPs: this.concurrentRequests.size,
      rateLimitedIPs: Array.from(this.requests.entries()).filter(
        ([, data]) => data.count >= CONNECTION_POOL_CONFIG.MAX_REQUESTS_PER_MINUTE
      ).length,
    };
  }
}

// Connection pool manager
class ConnectionPool {
  private prisma: PrismaClient;
  private rateLimiter: RateLimiter;
  private queryQueue: Array<{
    query: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  
  private processingQueue = false;
  private activeConnections = 0;
  private stats = {
    totalQueries: 0,
    failedQueries: 0,
    avgQueryTime: 0,
    queueLength: 0,
    peakQueueLength: 0,
  };

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: ['error', 'warn'],
    });
    
    this.rateLimiter = new RateLimiter();
    
    // Start queue processor
    this.processQueue();
    
    // Cleanup interval
    setInterval(() => {
      this.cleanup();
    }, 30000); // Every 30 seconds
  }

  // Execute query with rate limiting and connection pooling
  async execute<T>(
    query: () => Promise<T>,
    identifier: string = 'default'
  ): Promise<T> {
    // Check rate limit
    const rateLimitCheck = this.rateLimiter.isAllowed(identifier);
    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limited: ${rateLimitCheck.reason}`);
    }
    
    // Track request
    this.rateLimiter.trackRequestStart(identifier);
    
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Query timeout'));
      }, CONNECTION_POOL_CONFIG.QUERY_TIMEOUT);
      
      this.queryQueue.push({
        query: query as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });
      
      this.stats.queueLength = this.queryQueue.length;
      this.stats.peakQueueLength = Math.max(this.stats.peakQueueLength, this.queryQueue.length);
      
      // Process queue if not already processing
      if (!this.processingQueue) {
        this.processQueue();
      }
    }).finally(() => {
      this.rateLimiter.trackRequestEnd(identifier);
    });
  }

  // Process query queue
  private async processQueue() {
    if (this.processingQueue || this.queryQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    while (this.queryQueue.length > 0 && this.activeConnections < CONNECTION_POOL_CONFIG.MAX_CONNECTIONS) {
      const item = this.queryQueue.shift();
      if (!item) break;
      
      this.activeConnections++;
      this.stats.totalQueries++;
      
      // Execute query
      const startTime = Date.now();
      
      try {
        const result = await item.query();
        clearTimeout(item.timeout);
        
        // Update stats
        const queryTime = Date.now() - startTime;
        this.stats.avgQueryTime = (this.stats.avgQueryTime + queryTime) / 2;
        
        item.resolve(result);
      } catch (error) {
        clearTimeout(item.timeout);
        this.stats.failedQueries++;
        item.reject(error);
      } finally {
        this.activeConnections--;
        this.stats.queueLength = this.queryQueue.length;
      }
    }
    
    this.processingQueue = false;
    
    // Continue processing if queue not empty
    if (this.queryQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  // Batch execute multiple queries
  async executeBatch<T>(
    queries: Array<() => Promise<T>>,
    identifier: string = 'batch'
  ): Promise<T[]> {
    const batches = [];
    
    // Split into smaller batches
    for (let i = 0; i < queries.length; i += CONNECTION_POOL_CONFIG.BATCH_SIZE) {
      const batch = queries.slice(i, i + CONNECTION_POOL_CONFIG.BATCH_SIZE);
      batches.push(batch);
    }
    
    const results: T[] = [];
    
    // Execute batches sequentially to avoid overwhelming the database
    for (const batch of batches) {
      const batchPromises = batch.map(query => this.execute(query, identifier));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  // Get optimized Prisma client
  getClient(): PrismaClient {
    return this.prisma;
  }

  // Cleanup function
  private cleanup() {
    // Remove expired rate limit entries
    const now = Date.now();
    this.rateLimiter['requests'].forEach((data, key) => {
      if (now > data.resetTime) {
        this.rateLimiter['requests'].delete(key);
      }
    });
    
    // Clear zero concurrent requests
    this.rateLimiter['concurrentRequests'].forEach((count, key) => {
      if (count === 0) {
        this.rateLimiter['concurrentRequests'].delete(key);
      }
    });
    
    console.log(`🧹 Connection pool cleanup: ${this.activeConnections} active connections, ${this.queryQueue.length} queued queries`);
  }

  // Get comprehensive stats
  getStats() {
    return {
      connectionPool: {
        activeConnections: this.activeConnections,
        maxConnections: CONNECTION_POOL_CONFIG.MAX_CONNECTIONS,
        queueLength: this.queryQueue.length,
        peakQueueLength: this.stats.peakQueueLength,
        utilization: this.activeConnections / CONNECTION_POOL_CONFIG.MAX_CONNECTIONS,
      },
      queryStats: {
        totalQueries: this.stats.totalQueries,
        failedQueries: this.stats.failedQueries,
        successRate: this.stats.totalQueries > 0 ? 
          (this.stats.totalQueries - this.stats.failedQueries) / this.stats.totalQueries : 0,
        avgQueryTime: this.stats.avgQueryTime,
      },
      rateLimiting: this.rateLimiter.getStats(),
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down connection pool...');
    
    // Wait for active connections to finish
    while (this.activeConnections > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Disconnect Prisma
    await this.prisma.$disconnect();
    
    console.log('✅ Connection pool shut down successfully');
  }
}

// Export singleton instance
export const connectionPool = new ConnectionPool();

// Utility functions for common operations
export const dbUtils = {
  // Safe query execution with automatic retry
  async safeQuery<T>(
    query: () => Promise<T>,
    identifier: string = 'default',
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await connectionPool.execute(query, identifier);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  },
  
  // Batch query execution
  async batchQuery<T>(
    queries: Array<() => Promise<T>>,
    identifier: string = 'batch'
  ): Promise<T[]> {
    return connectionPool.executeBatch(queries, identifier);
  },
  
  // Get database statistics
  async getDbStats() {
    return connectionPool.getStats();
  },
};

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  await connectionPool.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await connectionPool.shutdown();
  process.exit(0);
}); 