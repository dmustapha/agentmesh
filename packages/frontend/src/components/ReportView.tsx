// File: packages/frontend/src/components/ReportView.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import type { AuditReport, Severity } from '@agentmesh/shared';

const SEV_CONFIG: Record<Severity, { bg: string; text: string; border: string; badge: string; glow: string }> = {
  CRITICAL: { bg: 'bg-red-500/8', text: 'text-red-400', border: 'border-red-500/20', badge: 'badge-critical', glow: 'rgba(239,68,68,0.1)' },
  HIGH: { bg: 'bg-orange-500/8', text: 'text-orange-400', border: 'border-orange-500/20', badge: 'badge-high', glow: 'rgba(249,115,22,0.08)' },
  MEDIUM: { bg: 'bg-yellow-500/8', text: 'text-yellow-400', border: 'border-yellow-500/20', badge: 'badge-medium', glow: 'rgba(234,179,8,0.06)' },
  LOW: { bg: 'bg-blue-500/8', text: 'text-blue-400', border: 'border-blue-500/20', badge: 'badge-low', glow: 'rgba(59,130,246,0.06)' },
  INFO: { bg: 'bg-gray-500/8', text: 'text-gray-400', border: 'border-gray-500/20', badge: 'badge-info', glow: 'rgba(100,116,139,0.04)' },
};

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
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      animate();
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [value, delay]);
  return <span className="number-counter">{display}</span>;
}

export function ReportView({ report }: { report: AuditReport }) {
  const { consensus } = report;

  const sevCounts = {
    CRITICAL: consensus.findings.filter((f) => f.finalSeverity === 'CRITICAL').length,
    HIGH: consensus.findings.filter((f) => f.finalSeverity === 'HIGH').length,
    MEDIUM: consensus.findings.filter((f) => f.finalSeverity === 'MEDIUM').length,
    LOW: consensus.findings.filter((f) => f.finalSeverity === 'LOW').length,
  };

  return (
    <div className="space-y-5">
      {/* Report Header */}
      <div className="glass-card p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-serif font-semibold text-white flex items-center gap-2">
              Security Audit Report
              <svg className="w-4 h-4 text-mesh-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </h2>
            <p className="text-[11px] text-mesh-muted-dim mt-1 font-mono">ID: {report.id}</p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-2 justify-end">
              <div className="w-16 h-1.5 rounded-full bg-mesh-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mesh-accent to-mesh-accent-light transition-all duration-1000"
                  style={{ width: `${consensus.agreementRatio * 100}%` }}
                />
              </div>
              <span className="text-sm text-mesh-accent-light font-semibold font-mono">
                {(consensus.agreementRatio * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-[11px] text-mesh-muted-dim font-mono">
              {consensus.totalAgents} agents | {(report.duration / 1000).toFixed(1)}s
            </p>
          </div>
        </div>

        {/* Severity Summary */}
        <div className="grid grid-cols-4 gap-3">
          {([
            { key: 'CRITICAL' as const, label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/8', borderColor: 'border-red-500/15' },
            { key: 'HIGH' as const, label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/8', borderColor: 'border-orange-500/15' },
            { key: 'MEDIUM' as const, label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/8', borderColor: 'border-yellow-500/15' },
            { key: 'LOW' as const, label: 'Low', color: 'text-blue-400', bgColor: 'bg-blue-500/8', borderColor: 'border-blue-500/15' },
          ]).map(({ key, label, color, bgColor, borderColor }, i) => (
            <div
              key={key}
              className={`${bgColor} ${borderColor} border rounded-xl p-3 text-center transition-all duration-300 hover:scale-105 animate-scale-in`}
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
            >
              <p className={`text-2xl font-bold ${color} font-mono`}>
                <AnimatedNumber value={sevCounts[key]} delay={i * 100 + 200} />
              </p>
              <p className="text-[10px] text-mesh-muted mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* On-chain Proofs */}
        <div className="mt-5 pt-4 border-t border-mesh-border/50 space-y-2.5">
          {consensus.storageRootHash && consensus.storageRootHash !== 'STORAGE_UNAVAILABLE' && (
            <div className="flex items-center gap-2 text-xs animate-slide-in-right" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
              <div className="w-5 h-5 rounded-md bg-mesh-accent/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-mesh-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                </svg>
              </div>
              <span className="text-mesh-muted">0G Storage:</span>
              <span className="font-mono text-mesh-muted-dim">{consensus.storageRootHash.slice(0, 24)}...</span>
            </div>
          )}
          {consensus.attestationTxHash && consensus.attestationTxHash !== 'ATTESTATION_UNAVAILABLE' && (
            <div className="flex items-center gap-2 text-xs animate-slide-in-right" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
              <div className="w-5 h-5 rounded-md bg-mesh-green/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-mesh-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-mesh-muted">Attestation:</span>
              <a
                href={`https://chainscan-galileo.0g.ai/tx/${consensus.attestationTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-mesh-accent hover:text-mesh-accent-light transition-colors duration-300 underline underline-offset-2"
              >
                {consensus.attestationTxHash.slice(0, 24)}...
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-3">
        {consensus.findings.map((cf, i) => {
          const sev = SEV_CONFIG[cf.finalSeverity];
          return (
            <div
              key={i}
              className={`glass-card ${sev.border} border p-5 animate-fade-in-up`}
              style={{
                animationDelay: `${i * 80 + 300}ms`,
                animationFillMode: 'both',
                boxShadow: `0 4px 24px ${sev.glow}`,
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-white">{cf.finding.title}</h3>
                <span className={sev.badge}>{cf.finalSeverity}</span>
              </div>
              <p className="text-[13px] text-mesh-muted leading-relaxed mb-3">{cf.finding.description}</p>
              {cf.finding.evidence && (
                <pre className="text-xs bg-mesh-bg/80 rounded-xl p-3.5 overflow-x-auto mb-3 border border-mesh-border/50 font-mono text-mesh-muted-dim leading-relaxed">
                  {cf.finding.evidence}
                </pre>
              )}
              <div className="flex items-center gap-4 text-[11px] text-mesh-muted">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  {cf.agreedCount}/{consensus.totalAgents} agents agree
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  {(cf.consensusConfidence * 100).toFixed(0)}% confidence
                </span>
                {cf.finding.lineNumbers && (
                  <span className="font-mono text-mesh-muted-dim">Lines: {cf.finding.lineNumbers}</span>
                )}
              </div>
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
