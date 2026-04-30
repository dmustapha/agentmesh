// File: packages/frontend/src/lib/api.ts

import type { AgentNode } from '@agentmesh/shared';

const API_BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export const fetchAgents = () => apiFetch<{ agents: AgentNode[] }>('/agents');
export const fetchTopology = () => apiFetch<{ topology: Record<string, { peerId: string; peers: string[] }> }>('/topology');
export const fetchProof = () => apiFetch<{
  agents: Array<{ name: string; peerId: string; specialty: string; status: string }>;
  contracts: { agentRegistry: string; auditAttestation: string; explorerBase: string };
  ens: { network: string; parentName: string; subnames: string[] };
  topology: Record<string, { peerId: string; peers: string[] }>;
}>('/proof');
export const fetchAuditReport = (id: string) => apiFetch<{ report: Record<string, unknown> }>(`/audit/${id}`);
export const startAuditRequest = (input: { contractAddress?: string; sourceCode?: string }) =>
  apiFetch<{ auditId: string; status: string }>('/audit', {
    method: 'POST',
    body: JSON.stringify(input),
  });
