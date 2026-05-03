// File: packages/frontend/src/components/ChatFeed.tsx
'use client';

import { useRef, useEffect } from 'react';
import type { AXLMessage, AgentNode } from '@agentmesh/shared';
import { SPECIALTY_TEXT_COLORS, SPECIALTY_BG_COLORS } from '@/lib/agent-colors';

const MSG_TYPE_CONFIG: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  finding: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Finding', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z' },
  analysis: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', label: 'Scanning', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  result: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', label: 'Result', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  fallback: { bg: 'bg-mesh-border/20', text: 'text-mesh-muted', label: 'Static', icon: 'M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z' },
  debate: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Debate', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  vote: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'Vote', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  'vote-abstain': { bg: 'bg-mesh-border/20', text: 'text-mesh-muted-dim', label: 'Pass', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
  consensus: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Consensus', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
};

function formatPayload(type: string, payload: unknown): string {
  if (!payload || typeof payload !== 'object') return String(payload || '');
  const p = payload as Record<string, unknown>;

  switch (type) {
    case 'analysis':
      return `Running ${p.specialty} scan on the contract...`;
    case 'result':
      return `Found ${p.count} potential ${p.specialty} issue${p.count === 1 ? '' : 's'} from static analysis`;
    case 'fallback':
      return `Static scan complete for ${p.specialty}. Results added to report.`;
    case 'finding': {
      const title = p.title || (p as Record<string, unknown>).type || 'issue';
      const sev = p.severity || '';
      return `${sev ? `[${sev}] ` : ''}${title}`;
    }
    case 'vote':
      return p.agree
        ? `Agrees with finding (${Math.round(Number(p.confidence || 0) * 100)}% confidence)`
        : `Disagrees with finding (${Math.round(Number(p.confidence || 0) * 100)}% confidence)`;
    case 'vote-abstain':
      return `Passed on this finding — deferring to other agents.`;
    case 'debate':
      return p.reasoning ? String(p.reasoning).slice(0, 140) : 'Discussing finding with other agents...';
    case 'consensus':
      return p.reportHash ? 'Consensus reached. Report finalized.' : 'Agents reaching consensus...';
    default:
      return JSON.stringify(p).slice(0, 140);
  }
}

interface ChatFeedProps {
  messages: AXLMessage[];
  agents: AgentNode[];
}

export function ChatFeed({ messages, agents }: ChatFeedProps) {
  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div className="glass-card overflow-hidden">
      <div ref={scrollRef} className="max-h-80 overflow-y-auto p-3 space-y-0.5">
        {messages.map((msg, i) => {
          const sender = agentMap.get(msg.fromAgent);
          const displayName = sender ? sender.ensName.split('.')[0] : msg.fromAgent.slice(0, 8);
          const colorClass = sender ? (SPECIALTY_TEXT_COLORS[sender.specialty] || 'text-mesh-accent') : 'text-mesh-accent';
          const typeConfig = MSG_TYPE_CONFIG[msg.type] || { bg: 'bg-mesh-border/30', text: 'text-mesh-muted', icon: '' };
          const isNew = i === messages.length - 1;

          return (
            <div
              key={i}
              className={`py-2 px-2 rounded-lg border-b border-mesh-border/30 last:border-0 transition-all duration-300 hover:bg-white/[0.02] ${
                isNew ? 'animate-slide-up' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    sender ? (SPECIALTY_BG_COLORS[sender.specialty] || 'bg-mesh-accent') : 'bg-mesh-accent'
                  }`} />
                  <span className={`font-mono text-[11px] font-semibold ${colorClass}`}>{displayName}</span>
                </div>
                <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md ${typeConfig.bg} ${typeConfig.text}`}>
                  {typeConfig.icon && (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={typeConfig.icon} />
                    </svg>
                  )}
                  {typeConfig.label || msg.type}
                </span>
              </div>
              <p className="text-[11px] text-mesh-muted leading-relaxed pl-3">
                {formatPayload(msg.type, msg.payload)}
              </p>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="py-10 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-mesh-accent/5 border border-mesh-border flex items-center justify-center">
              <svg className="w-5 h-5 text-mesh-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-xs text-mesh-muted font-medium">Waiting for agent communication</p>
            <p className="text-[10px] text-mesh-muted-dim mt-1">Messages appear during an active audit</p>
          </div>
        )}
      </div>
      {messages.length > 0 && (
        <div className="px-3 py-2 border-t border-mesh-border/30 flex items-center justify-between">
          <span className="text-[9px] text-mesh-muted-dim font-mono">{messages.length} messages</span>
          <span className="flex items-center gap-1 text-[9px] text-mesh-accent">
            <span className="w-1 h-1 rounded-full bg-mesh-accent animate-pulse" />
            live
          </span>
        </div>
      )}
    </div>
  );
}
