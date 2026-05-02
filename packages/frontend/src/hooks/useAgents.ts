// File: packages/frontend/src/hooks/useAgents.ts
'use client';

import { useState, useEffect } from 'react';
import type { AgentNode, WSEvent } from '@agentmesh/shared';
import { fetchAgents, fetchTopology } from '@/lib/api';

export function useAgents(events: WSEvent[]) {
  const [agents, setAgents] = useState<AgentNode[]>([]);
  const [topology, setTopology] = useState<Record<string, { peerId: string; peers: string[] }>>({});

  // Initial fetch
  useEffect(() => {
    fetchAgents().then((data) => setAgents(data.agents)).catch(console.error);
    fetchTopology().then((data) => setTopology(data.topology)).catch(console.error);
  }, []);

  // Update from WebSocket events
  useEffect(() => {
    const lastEvent = events[events.length - 1];
    if (!lastEvent) return;

    if (lastEvent.type === 'agent:status') {
      const data = lastEvent.data;
      if (data && typeof data === 'object' && 'id' in data && 'specialty' in data) {
        const updated = data as AgentNode;
        setAgents((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a)),
        );
      }
    }

    if (lastEvent.type === 'topology:update') {
      const data = lastEvent.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setTopology(data as Record<string, { peerId: string; peers: string[] }>);
      }
    }
  }, [events]);

  return { agents, topology };
}
