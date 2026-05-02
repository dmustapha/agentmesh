// File: packages/frontend/src/hooks/useWebSocket.ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSEvent } from '@agentmesh/shared';

export function useWebSocket(url: string) {
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);

  const connect = useCallback(() => {
    // Clean up any existing connection before reconnecting
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect loop on intentional close
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setConnected(true);
        retryRef.current = 0; // Reset backoff on successful connection
      };
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Exponential backoff: 1s → 2s → 4s → 8s → ... → 30s cap
        const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30_000);
        retryRef.current++;
        setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (event) => {
        try {
          const wsEvent = JSON.parse(event.data) as WSEvent;
          setEvents((prev) => [...prev.slice(-100), wsEvent]); // Keep last 100 events
        } catch { /* ignore parse errors */ }
      };

      wsRef.current = ws;
    } catch {
      // WebSocket constructor can throw if URL is invalid
      const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30_000);
      retryRef.current++;
      setTimeout(connect, delay);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on unmount
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { events, connected };
}
