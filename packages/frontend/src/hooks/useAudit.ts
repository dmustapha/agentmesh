// File: packages/frontend/src/hooks/useAudit.ts
'use client';

import { useState, useEffect, useRef } from 'react';
import type { AuditReport, AXLMessage, Finding, WSEvent } from '@agentmesh/shared';
import { startAuditRequest } from '@/lib/api';

const AUDIT_TIMEOUT_MS = 130_000; // 130s — slightly above backend's 120s MAX_AUDIT_DURATION

export function useAudit(events: WSEvent[]) {
  const [audit, setAudit] = useState<{ id: string; status: string } | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [messages, setMessages] = useState<AXLMessage[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAuditTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startAudit = async (input: { contractAddress?: string; sourceCode?: string }) => {
    try {
      setError(null);
      clearAuditTimeout();
      const result = await startAuditRequest(input);
      setAudit({ id: result.auditId, status: 'started' });
      setMessages([]);
      setFindings([]);
      setReport(null);
      // Safety timeout — if backend never sends audit:complete
      timeoutRef.current = setTimeout(() => {
        setAudit((prev) => prev?.status === 'started' ? { ...prev, status: 'timeout' } : prev);
        setError('Audit timed out. The backend may be unresponsive.');
      }, AUDIT_TIMEOUT_MS);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start audit. Is the backend running?';
      setError(message);
      setAudit(null);
    }
  };

  useEffect(() => {
    const lastEvent = events[events.length - 1];
    if (!lastEvent) return;

    switch (lastEvent.type) {
      case 'agent:message': {
        const data = lastEvent.data;
        if (data && typeof data === 'object' && 'type' in data && 'fromAgent' in data) {
          setMessages((prev) => [...prev.slice(-50), data as AXLMessage]);
        }
        break;
      }
      case 'audit:finding': {
        const data = lastEvent.data;
        if (data && typeof data === 'object' && 'id' in data && 'severity' in data) {
          setFindings((prev) => [...prev, data as Finding]);
        }
        break;
      }
      case 'audit:complete': {
        const data = lastEvent.data;
        if (data && typeof data === 'object' && 'id' in data && 'consensus' in data) {
          const completedReport = data as AuditReport;
          setReport(completedReport);
          setAudit((prev) => prev ? { ...prev, status: 'complete' } : null);
          clearAuditTimeout();
          sessionStorage.setItem(`report-${completedReport.id}`, JSON.stringify(completedReport));
        }
        break;
      }
    }
  }, [events]);

  // Cleanup timeout on unmount
  useEffect(() => clearAuditTimeout, []);

  return { audit, report, startAudit, messages, findings, error };
}
