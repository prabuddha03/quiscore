import { useState, useEffect, useRef, useCallback } from 'react';

interface UseScoreboardSSEOptions {
  eventId: string;
  enabled?: boolean;
}

interface ScoreboardData {
  teams: Array<{
    id: string;
    name: string;
    totalScore: number;
    scoresCount: number;
    scores: Array<{ points: number; criteriaId?: string }>;
  }>;
  lastUpdated: string;
  eventId: string;
}

type ConnectionType = 'sse' | 'polling' | 'disconnected';

export function useScoreboardSSE({ eventId, enabled = true }: UseScoreboardSSEOptions) {
  const [scoreboard, setScoreboard] = useState<ScoreboardData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<ConnectionType>('disconnected');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial data via REST API
  const fetchInitialData = useCallback(async () => {
    if (!eventId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/scoreboard/${eventId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch scoreboard: ${response.status}`);
      }
      
      const data = await response.json();
      setScoreboard(data);
      setLastUpdateTime(new Date());
      console.log('📊 Initial scoreboard data loaded');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load initial data';
      setError(errorMessage);
      console.error('❌ Error fetching initial scoreboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // HTTP Polling fallback (lightweight, no Socket.IO)
  const startPolling = useCallback(() => {
    if (!eventId || !enabled) {
      console.log('🔄 Cannot start polling - missing eventId or disabled');
      return;
    }
    
    // Don't start polling if SSE is already connected
    if (connectionType === 'sse' && isConnected) {
      console.log('🔄 SSE already connected, skipping polling');
      return;
    }
    
    console.log(`🔄 Starting lightweight HTTP polling for event: ${eventId}`);
    setConnectionType('polling');
    setIsConnected(true);
    setError(null);
    
    // Clear existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Optimized polling: faster for production, slower for development
    const isProduction = typeof window !== 'undefined' && window.location.hostname.includes('ondigitalocean.app');
    const pollInterval = isProduction ? 5000 : 10000; // 5s prod, 10s dev
    
    pollingIntervalRef.current = setInterval(async () => {
      console.log(`🔄 Polling scoreboard for event: ${eventId}`);
      try {
        const response = await fetch(`/api/scoreboard/${eventId}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }
        
        const data = await response.json();
        setScoreboard(data);
        setLastUpdateTime(new Date());
        console.log('📊 Scoreboard updated via lightweight polling');
      } catch (err) {
        console.error('❌ Polling error:', err);
        setError(`Polling error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        // Don't disconnect on single polling failure, but log it
      }
    }, pollInterval);
    
  }, [eventId, enabled, connectionType, isConnected]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    console.log('🔄 HTTP polling stopped');
  }, []);

  // Connect to SSE stream with fallback
  const connectSSE = useCallback(() => {
    if (!eventId || !enabled) return;
    
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    // Stop any existing polling
    stopPolling();

    console.log(`🔌 Attempting SSE connection for event: ${eventId}`);
    
    const eventSource = new EventSource(`/api/scoreboard/${eventId}/stream`);
    eventSourceRef.current = eventSource;

    let sseConnected = false;
    
    // Set a timeout to fallback to polling if SSE doesn't connect
    // Use very short timeout in production to minimize resource waste
    const isProduction = typeof window !== 'undefined' && window.location.hostname.includes('ondigitalocean.app');
    const timeoutMs = isProduction ? 1000 : 5000; // 1s prod, 5s dev - minimize wasted resources
    
    console.log(`🔌 SSE connection attempt (${isProduction ? 'production' : 'development'} mode, ${timeoutMs}ms timeout)`);
    console.log(`🔍 Platform info:`, {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      isProduction,
      protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown'
    });
    
    const connectionTimeout = setTimeout(() => {
      if (!sseConnected) {
        console.log(`⏰ SSE connection timeout after ${timeoutMs}ms, falling back to polling`);
        console.log('🔍 Timezone debug info:', {
          clientTime: new Date().toISOString(),
          clientTimestamp: Date.now(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timezoneName: new Date().toLocaleString('en-US', { timeZoneName: 'long' }),
          hostname: window.location.hostname,
          isProduction
        });
        eventSource.close();
        eventSourceRef.current = null;
        setError('SSE connection timeout, using polling mode');
        startPolling();
      }
    }, timeoutMs);

    eventSource.onopen = () => {
      sseConnected = true;
      setIsConnected(true);
      setConnectionType('sse');
      setError(null);
      console.log('🟢 SSE connection established successfully');
      console.log('📊 SSE connection details:', {
        eventId,
        readyState: eventSource.readyState,
        url: eventSource.url
      });
      
      // Clear the connection timeout
      clearTimeout(connectionTimeout);
      
      // Clear any reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    eventSource.onmessage = (event) => {
      try {
        // Make sure we're still considered connected
        if (!sseConnected) {
          sseConnected = true;
          setIsConnected(true);
          setConnectionType('sse');
          setError(null);
          console.log('🟢 SSE connection confirmed via message');
        }
        
        const newScoreboard = JSON.parse(event.data);
        setScoreboard(newScoreboard);
        setLastUpdateTime(new Date());
        console.log('📊 Scoreboard updated via SSE', {
          eventId,
          teamsCount: newScoreboard.teams?.length || 0,
          lastUpdated: newScoreboard.lastUpdated
        });
      } catch (err) {
        console.error('❌ Failed to parse SSE message:', err, 'Raw data:', event.data);
      }
    };

    // Handle custom events (like connection confirmation)
    eventSource.addEventListener('connected', (event) => {
      const connectionData = JSON.parse(event.data);
      const timeDiff = Date.now() - connectionData.timestamp;
      
      console.log('🟢 SSE connection event received:', {
        eventId: connectionData.eventId,
        timeDiff: `${timeDiff}ms`,
        status: connectionData.status
      });
      
      sseConnected = true;
      setIsConnected(true);
      setConnectionType('sse');
      setError(null);
      
      // Clear the connection timeout
      clearTimeout(connectionTimeout);
      
      // Clear any reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    });

    eventSource.addEventListener('ping', () => {
      console.log('🏓 SSE ping received');
      // Make sure we're still connected
      if (!sseConnected) {
        sseConnected = true;
        setIsConnected(true);
        setConnectionType('sse');
        setError(null);
        console.log('🟢 SSE connection confirmed via ping');
      }
    });

    eventSource.addEventListener('error', (event) => {
      console.log('🔴 SSE error event received:', event);
    });

    eventSource.onerror = () => {
      console.log('🔴 SSE connection error or lost');
      
      // Clear the connection timeout
      clearTimeout(connectionTimeout);
      
      // Close the failed SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Set disconnected state immediately
      setIsConnected(false);
      setConnectionType('disconnected');
      
             // If we never successfully connected via SSE, fall back to polling immediately
       if (!sseConnected) {
         console.log('🔄 SSE failed to connect, falling back to HTTP polling immediately');
         console.log('🔍 SSE failure details:', {
           eventId,
           readyState: eventSource.readyState,
           url: eventSource.url,
           environment: process.env.NODE_ENV
         });
         setError('SSE connection failed, using polling mode');
         startPolling();
      } else {
        // If we were previously connected, try to reconnect after a delay
        console.log('🔄 SSE connection lost, attempting reconnection...');
        reconnectTimeoutRef.current = setTimeout(() => {
          if (enabled) {
            console.log('🔄 Attempting SSE reconnection...');
            connectSSE();
          }
        }, 5000);
      }
    };

  }, [eventId, enabled, stopPolling, startPolling]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchInitialData();
  }, [fetchInitialData]);

  // Initialize connection
  useEffect(() => {
    if (!enabled) return;
    
    console.log(`🚀 Initializing scoreboard connection for event: ${eventId}`);
    
    // First fetch initial data
    fetchInitialData().then(() => {
      // Give a small delay to ensure page is stable before starting SSE
      setTimeout(() => {
        console.log('🔌 Starting SSE connection after initial data load');
        connectSSE();
      }, 1000); // 1 second delay
    }).catch((error) => {
      console.error('❌ Failed to fetch initial data, falling back to polling:', error);
      setError('Failed to load initial data, using polling mode');
      startPolling();
    });

    // Cleanup on unmount
    return () => {
      console.log(`🔄 Cleaning up scoreboard connection for event: ${eventId}`);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopPolling();
    };
  }, [eventId, enabled, fetchInitialData, connectSSE, stopPolling, startPolling]);

  return {
    scoreboard,
    isConnected,
    connectionType,
    isLoading,
    error,
    lastUpdateTime,
    refresh,
  };
} 