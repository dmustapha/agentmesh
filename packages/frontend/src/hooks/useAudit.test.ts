// Tests for useAudit hook
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudit } from './useAudit';
import type { WSEvent, AuditReport, AXLMessage, Finding } from '@agentmesh/shared';

// Mock the api module
vi.mock('@/lib/api', () => ({
  startAuditRequest: vi.fn(),
}));

import { startAuditRequest } from '@/lib/api';
const mockStartAudit = vi.mocked(startAuditRequest);

describe('useAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock sessionStorage
    const store: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
    });
  });

  it('starts with null state', () => {
    const { result } = renderHook(() => useAudit([]));
    expect(result.current.audit).toBeNull();
    expect(result.current.report).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.findings).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('starts an audit successfully', async () => {
    mockStartAudit.mockResolvedValue({ auditId: 'audit-1', status: 'started' });

    const { result } = renderHook(() => useAudit([]));
    await act(async () => {
      await result.current.startAudit({ sourceCode: 'pragma solidity ^0.8.0;' });
    });

    expect(result.current.audit).toEqual({ id: 'audit-1', status: 'started' });
    expect(result.current.error).toBeNull();
    expect(mockStartAudit).toHaveBeenCalledWith({ sourceCode: 'pragma solidity ^0.8.0;' });
  });

  it('handles audit start failure', async () => {
    mockStartAudit.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAudit([]));
    await act(async () => {
      await result.current.startAudit({ sourceCode: 'test' });
    });

    expect(result.current.audit).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('processes agent:message events', () => {
    const msg: AXLMessage = {
      type: 'finding',
      payload: {},
      fromAgent: 'agent-1',
      toAgent: 'agent-2',
      timestamp: Date.now(),
    };
    const events: WSEvent[] = [{ type: 'agent:message', data: msg, timestamp: Date.now() }];

    const { result } = renderHook(() => useAudit(events));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].fromAgent).toBe('agent-1');
  });

  it('processes audit:finding events', () => {
    const finding: Finding = {
      id: 'f-1',
      agentId: 'agent-1',
      agentSpecialty: 'reentrancy',
      type: 'reentrancy',
      severity: 'HIGH',
      title: 'Test finding',
      description: 'Test',
      evidence: 'Test',
      confidence: 0.8,
      timestamp: Date.now(),
    };
    const events: WSEvent[] = [{ type: 'audit:finding', data: finding, timestamp: Date.now() }];

    const { result } = renderHook(() => useAudit(events));
    expect(result.current.findings).toHaveLength(1);
    expect(result.current.findings[0].id).toBe('f-1');
  });

  it('processes audit:complete events and caches report', () => {
    const report: AuditReport = {
      id: 'report-1',
      request: { id: 'report-1', timestamp: Date.now() },
      consensus: {
        findings: [],
        totalAgents: 4,
        agreementRatio: 1,
        reportHash: '0xabc',
        storageRootHash: '',
        attestationTxHash: '',
        timestamp: Date.now(),
      },
      agents: [],
      duration: 5000,
      createdAt: Date.now(),
    };
    const events: WSEvent[] = [{ type: 'audit:complete', data: report, timestamp: Date.now() }];

    const { result } = renderHook(() => useAudit(events));
    expect(result.current.report).toBeDefined();
    expect(result.current.report?.id).toBe('report-1');
    // Check sessionStorage cache
    expect(sessionStorage.getItem('report-report-1')).toBeDefined();
  });

  it('accumulates events across re-renders', () => {
    const events1: WSEvent[] = [
      { type: 'audit:finding', data: { id: 'f-1' } as any, timestamp: 1 },
    ];
    const { result, rerender } = renderHook(
      ({ events }) => useAudit(events),
      { initialProps: { events: events1 } },
    );
    expect(result.current.findings).toHaveLength(1);

    const events2: WSEvent[] = [
      ...events1,
      { type: 'audit:finding', data: { id: 'f-2' } as any, timestamp: 2 },
    ];
    rerender({ events: events2 });
    expect(result.current.findings).toHaveLength(2);
  });
});
