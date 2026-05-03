// File: packages/frontend/src/components/ReportView.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import type { AuditReport, Severity, AgentSpecialty } from '@agentmesh/shared';

const SEV_CONFIG: Record<Severity, { text: string; border: string; badge: string; glow: string; bg: string }> = {
  CRITICAL: { bg: 'bg-red-500/8', text: 'text-red-400', border: 'border-red-500/20', badge: 'badge-critical', glow: 'rgba(239,68,68,0.10)' },
  HIGH:     { bg: 'bg-orange-500/8', text: 'text-orange-400', border: 'border-orange-500/20', badge: 'badge-high', glow: 'rgba(249,115,22,0.08)' },
  MEDIUM:   { bg: 'bg-yellow-500/8', text: 'text-yellow-400', border: 'border-yellow-500/20', badge: 'badge-medium', glow: 'rgba(234,179,8,0.06)' },
  LOW:      { bg: 'bg-blue-500/8', text: 'text-blue-400', border: 'border-blue-500/20', badge: 'badge-low', glow: 'rgba(59,130,246,0.06)' },
  INFO:     { bg: 'bg-gray-500/8', text: 'text-gray-400', border: 'border-gray-500/20', badge: 'badge-info', glow: 'rgba(100,116,139,0.04)' },
};

const SPECIALTY_CONFIG: Record<AgentSpecialty, { label: string; shortLabel: string; icon: React.ReactNode; color: string; bg: string }> = {
  'reentrancy': {
    label: 'Reentrancy',
    shortLabel: 'RE',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
  },
  'access-control': {
    label: 'Access Control',
    shortLabel: 'AC',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
  },
  'logic': {
    label: 'Logic',
    shortLabel: 'LG',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  'economic': {
    label: 'Economic',
    shortLabel: 'EC',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
};

function securityRating(criticals: number, highs: number, mediums: number, lows: number): { label: string; color: string; sublabel: string } {
  if (criticals > 0) return { label: 'Critical Risk', color: 'text-red-400', sublabel: 'Immediate action required' };
  if (highs > 0) return { label: 'High Risk', color: 'text-orange-400', sublabel: 'Serious vulnerabilities found' };
  if (mediums > 0) return { label: 'Moderate Risk', color: 'text-yellow-400', sublabel: 'Review before deployment' };
  if (lows > 0) return { label: 'Low Risk', color: 'text-blue-400', sublabel: 'Minor issues detected' };
  return { label: 'No Issues Found', color: 'text-mesh-green', sublabel: 'All agents report clean' };
}

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 600;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * value));
        if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      };
      animate();
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [value, delay]);
  return <span className="number-counter">{display}</span>;
}

export function ReportView({ report }: { report: AuditReport }) {
  const { consensus } = report;
  const [expandedVotes, setExpandedVotes] = useState<Set<number>>(new Set());

  const sevCounts = {
    CRITICAL: consensus.findings.filter((f) => f.finalSeverity === 'CRITICAL').length,
    HIGH: consensus.findings.filter((f) => f.finalSeverity === 'HIGH').length,
    MEDIUM: consensus.findings.filter((f) => f.finalSeverity === 'MEDIUM').length,
    LOW: consensus.findings.filter((f) => f.finalSeverity === 'LOW').length,
  };

  const activeSevCards = ([
    { key: 'CRITICAL' as const, label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/15' },
    { key: 'HIGH' as const, label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/15' },
    { key: 'MEDIUM' as const, label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/8', border: 'border-yellow-500/15' },
    { key: 'LOW' as const, label: 'Low', color: 'text-blue-400', bg: 'bg-blue-500/8', border: 'border-blue-500/15' },
  ]).filter((s) => sevCounts[s.key] > 0);

  const rating = securityRating(sevCounts.CRITICAL, sevCounts.HIGH, sevCounts.MEDIUM, sevCounts.LOW);

  const toggleVotes = (i: number) => {
    setExpandedVotes((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* Report Header */}
      <div className="glass-card p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-5">
          {/* Left: title + security verdict */}
          <div>
            <h2 className="text-lg font-serif font-semibold text-white flex items-center gap-2">
              Security Audit Report
              <svg className="w-4 h-4 text-mesh-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <span className={`text-sm font-semibold ${rating.color}`}>{rating.label}</span>
              <span className="text-mesh-border">·</span>
              <span className="text-[11px] text-mesh-muted">{rating.sublabel}</span>
            </div>
            <p className="text-[11px] text-mesh-muted-dim mt-1 font-mono">ID: {report.id}</p>
          </div>

          {/* Right: consensus bar */}
          <div className="text-right space-y-1">
            <div className="flex items-center gap-2 justify-end">
              <div className="w-20 h-1.5 rounded-full bg-mesh-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mesh-accent to-mesh-accent-light transition-all duration-1000"
                  style={{ width: `${consensus.agreementRatio * 100}%` }}
                />
              </div>
              <span className="text-sm text-mesh-accent-light font-semibold font-mono">
                {(consensus.agreementRatio * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-[10px] text-mesh-muted-dim">Agent consensus</p>
            <p className="text-[11px] text-mesh-muted-dim font-mono">
              {consensus.totalAgents} agents · {(report.duration / 1000).toFixed(1)}s
            </p>
          </div>
        </div>

        {/* Severity Summary — only show non-zero */}
        {activeSevCards.length > 0 ? (
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${activeSevCards.length}, minmax(0, 1fr))` }}>
            {activeSevCards.map(({ key, label, color, bg, border }, i) => (
              <div
                key={key}
                className={`${bg} ${border} border rounded-xl p-3 text-center animate-scale-in`}
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
              >
                <p className={`text-2xl font-bold ${color} font-mono`}>
                  <AnimatedNumber value={sevCounts[key]} delay={i * 100 + 200} />
                </p>
                <p className="text-[10px] text-mesh-muted mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-mesh-green/5 border border-mesh-green/20 rounded-xl p-3 text-center">
            <p className="text-mesh-green text-sm font-medium">No vulnerabilities detected</p>
          </div>
        )}

        {/* On-chain Proofs */}
        {(consensus.storageRootHash !== 'STORAGE_UNAVAILABLE' || consensus.attestationTxHash !== 'ATTESTATION_UNAVAILABLE') && (
          <div className="mt-5 pt-4 border-t border-mesh-border/50 space-y-2.5">
            {consensus.storageRootHash && consensus.storageRootHash !== 'STORAGE_UNAVAILABLE' && (
              <div className="flex items-center gap-2 text-xs animate-slide-in-right" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                <div className="w-5 h-5 rounded-md bg-mesh-accent/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-mesh-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                  </svg>
                </div>
                <span className="text-mesh-muted">Stored on 0G Network:</span>
                <span className="font-mono text-mesh-muted-dim" title={consensus.storageRootHash}>
                  {consensus.storageRootHash.slice(0, 20)}…
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(consensus.storageRootHash)}
                  className="ml-auto text-mesh-muted hover:text-white transition-colors"
                  title="Copy full hash"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                </button>
              </div>
            )}
            {consensus.attestationTxHash && consensus.attestationTxHash !== 'ATTESTATION_UNAVAILABLE' && (
              <div className="flex items-center gap-2 text-xs animate-slide-in-right" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
                <div className="w-5 h-5 rounded-md bg-mesh-green/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-mesh-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-mesh-muted">Attested on 0G Chain:</span>
                <a
                  href={`https://chainscan-galileo.0g.ai/tx/${consensus.attestationTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-mesh-accent hover:text-mesh-accent-light transition-colors duration-300 underline underline-offset-2"
                  title={consensus.attestationTxHash}
                >
                  {consensus.attestationTxHash.slice(0, 20)}…
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Findings */}
      <div className="space-y-3">
        {consensus.findings.map((cf, i) => {
          const sev = SEV_CONFIG[cf.finalSeverity];
          const spec = SPECIALTY_CONFIG[cf.finding.agentSpecialty as AgentSpecialty] ?? SPECIALTY_CONFIG['logic'];
          const votesOpen = expandedVotes.has(i);
          const realVotes = cf.votes.filter((v) => v.confidence > 0);
          const lineLabel = cf.finding.lineNumbers && cf.finding.lineNumbers !== 'static-scan'
            ? `Line ${cf.finding.lineNumbers}`
            : null;

          return (
            <div
              key={i}
              className={`glass-card ${sev.border} border animate-fade-in-up`}
              style={{ animationDelay: `${i * 80 + 300}ms`, animationFillMode: 'both', boxShadow: `0 4px 24px ${sev.glow}` }}
            >
              {/* Finding header */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="text-sm font-semibold text-white leading-snug">{cf.finding.title}</h3>
                  <span className={`${sev.badge} flex-shrink-0`}>{cf.finalSeverity}</span>
                </div>

                {/* Agent attribution */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${spec.bg} ${spec.color}`}>
                    {spec.icon}
                    {spec.label}
                  </span>
                  {lineLabel && (
                    <span className="text-[10px] text-mesh-muted font-mono bg-mesh-bg/60 border border-mesh-border/40 px-1.5 py-0.5 rounded">
                      {lineLabel}
                    </span>
                  )}
                </div>

                <p className="text-[13px] text-mesh-muted leading-relaxed mb-3">{cf.finding.description}</p>

                {cf.finding.evidence && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-mesh-border/50">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-mesh-bg/60 border-b border-mesh-border/40">
                      <span className="text-[9px] font-mono text-mesh-muted-dim uppercase tracking-wider">Evidence</span>
                      <span className="text-[9px] font-mono text-mesh-muted-dim">Solidity</span>
                    </div>
                    <pre className="text-xs bg-mesh-bg/80 px-3.5 py-3 overflow-x-auto font-mono text-mesh-muted-dim leading-relaxed">
                      {cf.finding.evidence}
                    </pre>
                  </div>
                )}

                {/* Consensus summary row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11px] text-mesh-muted">
                    {/* Vote dots */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: consensus.totalAgents }).map((_, ai) => {
                        const vote = cf.votes[ai];
                        const isAbstain = !vote || vote.confidence === 0;
                        const agreed = vote?.agree;
                        return (
                          <div
                            key={ai}
                            title={isAbstain ? 'Abstained' : agreed ? 'Agreed' : 'Disagreed'}
                            className={`w-2 h-2 rounded-full ${
                              isAbstain ? 'bg-mesh-border' : agreed ? 'bg-mesh-green' : 'bg-red-500/60'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span>{cf.agreedCount}/{consensus.totalAgents} agents agree</span>
                    <span className="text-mesh-border">·</span>
                    <span>{(cf.consensusConfidence * 100).toFixed(0)}% confidence</span>
                  </div>

                  {/* Expand votes button — only show if real votes exist */}
                  {realVotes.length > 0 && (
                    <button
                      onClick={() => toggleVotes(i)}
                      className="text-[10px] text-mesh-muted hover:text-mesh-accent-light transition-colors flex items-center gap-1"
                    >
                      {votesOpen ? 'Hide' : 'View'} agent reasoning
                      <svg
                        className={`w-2.5 h-2.5 transition-transform duration-200 ${votesOpen ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Vote reasoning panel */}
              {votesOpen && realVotes.length > 0 && (
                <div className="border-t border-mesh-border/40 bg-mesh-bg/30 px-5 py-4 space-y-3">
                  <p className="text-[10px] text-mesh-muted-dim uppercase tracking-wider font-medium">Agent Reasoning</p>
                  {cf.votes.map((vote, vi) => {
                    if (vote.confidence === 0) return null;
                    const agentSpec = report.agents.find((a) => a.id === vote.agentId);
                    const specInfo = agentSpec ? SPECIALTY_CONFIG[agentSpec.specialty] : null;
                    return (
                      <div key={vi} className="flex gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border ${specInfo?.bg ?? 'bg-mesh-border/20 border-mesh-border'} ${specInfo?.color ?? 'text-mesh-muted'}`}>
                          {specInfo?.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-medium ${specInfo?.color ?? 'text-mesh-muted'}`}>
                              {specInfo?.label ?? 'Agent'}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${vote.agree ? 'bg-mesh-green/15 text-mesh-green' : 'bg-red-500/15 text-red-400'}`}>
                              {vote.agree ? '✓ Agrees' : '✗ Disagrees'}
                            </span>
                            {vote.severity !== cf.finalSeverity && (
                              <span className="text-[9px] text-mesh-muted-dim">rates {vote.severity}</span>
                            )}
                          </div>
                          {vote.reasoning && (
                            <p className="text-[11px] text-mesh-muted leading-relaxed">{vote.reasoning}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {consensus.findings.length === 0 && (
          <div className="glass-card p-12 text-center animate-fade-in">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-mesh-green/10 border border-mesh-green/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-mesh-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-mesh-muted font-medium">No vulnerabilities detected</p>
            <p className="text-xs text-mesh-muted-dim mt-1">All {consensus.totalAgents} agents completed analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}
