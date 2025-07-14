import { useState, useEffect, useCallback, useRef } from 'react';

interface AdminNotification {
  type: 'score_submitted' | 'team_added' | 'round_updated';
  message: string;
  timestamp: string;
  eventId: string;
  data?: Record<string, unknown>;
}

interface UseAdminSSEOptions {
  eventId: string;
  enabled?: boolean;
}

export function useAdminSSE({ eventId, enabled = true }: UseAdminSSEOptions) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to admin SSE stream
  const connectSSE = useCallback(() => {
    if (!eventId || !enabled) return;
    
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    console.log(`🔧 Connecting to admin SSE stream for event: ${eventId}`);
    
    const eventSource = new EventSource(`/api/admin/${eventId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('🟢 Admin SSE connection established');
      
      // Clear any reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const notification: AdminNotification = JSON.parse(event.data);
        
        setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10 notifications
        setLastActivity(new Date());
        
        console.log('🔔 Admin notification received:', notification.type);
      } catch (err) {
        console.error('❌ Failed to parse admin SSE message:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      console.log('🔴 Admin SSE connection lost, will retry in 10 seconds');
      
      // Auto-reconnect after 10 seconds (longer than scoreboard since admin is less critical)
      reconnectTimeoutRef.current = setTimeout(() => {
        if (enabled) {
          connectSSE();
        }
      }, 10000);
    };

  }, [eventId, enabled]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Dismiss specific notification
  const dismissNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (!enabled) return;
    
    connectSSE();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [eventId, enabled, connectSSE]);

  return {
    notifications,
    isConnected,
    lastActivity,
    clearNotifications,
    dismissNotification,
  };
} 