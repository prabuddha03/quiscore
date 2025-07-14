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

  // HTTP Polling fallback
  const startPolling = useCallback(() => {
    if (!eventId || !enabled) return;
    
    console.log(`🔄 Starting HTTP polling for event: ${eventId}`);
    setConnectionType('polling');
    setIsConnected(true);
    
    // Clear existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Poll every 10 seconds (more conservative than SSE)
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/scoreboard/${eventId}`);
        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }
        
        const data = await response.json();
        setScoreboard(data);
        setLastUpdateTime(new Date());
        console.log('📊 Scoreboard updated via polling');
      } catch (err) {
        console.error('❌ Polling error:', err);
        // Don't disconnect on single polling failure
      }
    }, 10000); // Poll every 10 seconds
    
  }, [eventId, enabled]);

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

    eventSource.onopen = () => {
      sseConnected = true;
      setIsConnected(true);
      setConnectionType('sse');
      setError(null);
      console.log('🟢 SSE connection established');
      
      // Clear any reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const newScoreboard = JSON.parse(event.data);
        setScoreboard(newScoreboard);
        setLastUpdateTime(new Date());
        console.log('📊 Scoreboard updated via SSE');
      } catch (err) {
        console.error('❌ Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = () => {
      console.log('🔴 SSE connection error or lost');
      
      // Close the failed SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // If we never successfully connected via SSE, or if this is a capacity issue,
      // fall back to polling immediately
      if (!sseConnected || connectionType === 'disconnected') {
        console.log('🔄 SSE failed, falling back to HTTP polling');
        startPolling();
      } else {
        // If we were previously connected, try to reconnect after a delay
        setIsConnected(false);
        setConnectionType('disconnected');
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (enabled) {
            console.log('🔄 Attempting SSE reconnection...');
            connectSSE();
          }
        }, 5000);
      }
    };

  }, [eventId, enabled, connectionType, stopPolling, startPolling]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchInitialData();
  }, [fetchInitialData]);

  // Initialize connection
  useEffect(() => {
    if (!enabled) return;
    
    // First fetch initial data
    fetchInitialData().then(() => {
      // Then try SSE connection
      connectSSE();
    });

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopPolling();
    };
  }, [eventId, enabled, fetchInitialData, connectSSE, stopPolling]);

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