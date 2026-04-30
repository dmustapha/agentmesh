// File: packages/frontend/src/hooks/useAudit.ts
'use client';

import { useState, useEffect } from 'react';
import type { AuditReport, AXLMessage, Finding, WSEvent } from '@agentmesh/shared';
import { startAuditRequest } from '@/lib/api';

export function useAudit(events: WSEvent[]) {
  const [audit, setAudit] = useState<{ id: string; status: string } | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [messages, setMessages] = useState<AXLMessage[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startAudit = async (input: { contractAddress?: string; sourceCode?: string }) => {
    try {
      setError(null);
      const result = await startAuditRequest(input);
      setAudit({ id: result.auditId, status: 'started' });
      setMessages([]);
      setFindings([]);
      setReport(null);
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
      case 'agent:message':
        setMessages((prev) => [...prev.slice(-50), lastEvent.data as AXLMessage]);
        break;
      case 'audit:finding':
        setFindings((prev) => [...prev, lastEvent.data as Finding]);
        break;
      case 'audit:complete': {
        const completedReport = lastEvent.data as AuditReport;
        setReport(completedReport);
        setAudit((prev) => prev ? { ...prev, status: 'complete' } : null);
        // Cache for report page
        sessionStorage.setItem(`report-${completedReport.id}`, JSON.stringify(completedReport));
        break;
      }
    }
  }, [events]);

  return { audit, report, startAudit, messages, findings, error };
}
