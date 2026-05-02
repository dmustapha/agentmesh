// File: packages/frontend/src/components/AuditConsole.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface AuditConsoleProps {
  onSubmit: (input: { contractAddress?: string; sourceCode?: string }) => void;
  auditStatus?: string;
  error?: string | null;
}

const AUDIT_STEPS = [
  { key: 'submit', label: 'Submit Contract', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'analyze', label: 'Agent Analysis', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { key: 'debate', label: 'Multi-Agent Debate', icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z' },
  { key: 'consensus', label: 'On-Chain Consensus', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

function getStepIndex(status?: string): number {
  if (!status) return -1;
  if (status === 'started') return 1;
  if (status === 'analyzing') return 1;
  if (status === 'debating') return 2;
  if (status === 'voting') return 3;
  if (status === 'complete') return 4;
  return 0;
}

export function AuditConsole({ onSubmit, auditStatus, error }: AuditConsoleProps) {
  const [mode, setMode] = useState<'address' | 'source'>('address');
  const [contractAddress, setContractAddress] = useState('');
  const [sourceCode, setSourceCode] = useState('');
  const [validationError, setValidationError] = useState('');
  const isRunning = auditStatus === 'started';
  const progressRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning) { setElapsed(0); return; }
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const handleSubmit = () => {
    setValidationError('');
    if (mode === 'address') {
      if (!contractAddress.trim()) { setValidationError('Please enter a contract address'); return; }
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress.trim())) {
        setValidationError('Invalid address format. Expected 0x followed by 40 hex characters.');
        return;
      }
      onSubmit({ contractAddress: contractAddress.trim() });
    } else {
      if (!sourceCode.trim() || sourceCode.trim().length < 10) {
        setValidationError('Please paste valid Solidity source code (minimum 10 characters)');
        return;
      }
      onSubmit({ sourceCode: sourceCode.trim() });
    }
  };

  const stepIndex = getStepIndex(auditStatus);

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            Smart Contract Audit
            {isRunning && <span className="inline-flex h-2 w-2 rounded-full bg-mesh-accent animate-pulse" />}
          </h2>
          <p className="text-sm text-mesh-muted mt-0.5">
            Multi-agent security analysis via decentralized P2P mesh
          </p>
        </div>
        {isRunning && (
          <div className="text-right animate-fade-in">
            <span className="text-xs text-mesh-accent font-mono">{elapsed}s</span>
            <p className="text-[10px] text-mesh-muted">elapsed</p>
          </div>
        )}
      </div>

      {/* Progress Steps */}
      {isRunning && (
        <div ref={progressRef} className="animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            {AUDIT_STEPS.map((step, i) => {
              const isComplete = i < stepIndex;
              const isCurrent = i === stepIndex;
              return (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isComplete
                      ? 'bg-mesh-green/20 border border-mesh-green/40'
                      : isCurrent
                        ? 'bg-mesh-accent/20 border border-mesh-accent/40 animate-pulse-glow'
                        : 'bg-mesh-bg border border-mesh-border'
                  }`}>
                    <svg className={`w-3.5 h-3.5 transition-colors duration-500 ${
                      isComplete ? 'text-mesh-green' : isCurrent ? 'text-mesh-accent' : 'text-mesh-muted'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      {isComplete ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                      )}
                    </svg>
                    {isCurrent && (
                      <span className="absolute inset-0 rounded-full border border-mesh-accent/30 animate-ping opacity-40" />
                    )}
                  </div>
                  <span className={`text-[9px] mt-1.5 font-medium transition-colors duration-500 ${
                    isComplete ? 'text-mesh-green' : isCurrent ? 'text-mesh-accent-light' : 'text-mesh-muted'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(100, (stepIndex / AUDIT_STEPS.length) * 100 + (isRunning ? 10 : 0))}%` }}
            />
          </div>
        </div>
      )}

      {/* Mode Selector */}
      <div className="flex rounded-xl overflow-hidden border border-mesh-border bg-mesh-bg/50">
        {(['address', 'source'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            disabled={isRunning}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-all duration-300 relative ${
              mode === m
                ? 'text-mesh-accent-light bg-mesh-accent/10'
                : 'text-mesh-muted hover:text-gray-300 hover:bg-white/[0.02]'
            } ${m === 'address' ? 'border-r border-mesh-border' : ''}`}
          >
            {m === 'address' ? 'Contract Address' : 'Paste Source Code'}
            {mode === m && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-mesh-accent to-mesh-accent-light" />
            )}
          </button>
        ))}
      </div>

      {/* Input */}
      {mode === 'address' ? (
        <div className="space-y-2">
          <label className="text-[11px] text-mesh-muted font-medium uppercase tracking-wide">EVM Contract Address</label>
          <div className="relative group">
            <input
              type="text"
              placeholder="0x..."
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              disabled={isRunning}
              className="input-field group-hover:border-mesh-border-light"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-mesh-muted-dim font-mono">
              {contractAddress.length > 0 ? `${contractAddress.length}/42` : ''}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-[11px] text-mesh-muted font-medium uppercase tracking-wide">Solidity Source Code</label>
          <textarea
            placeholder="// SPDX-License-Identifier: MIT&#10;pragma solidity ^0.8.0;&#10;&#10;contract MyContract {&#10;  ..."
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            disabled={isRunning}
            rows={10}
            className="input-field resize-none"
          />
          {sourceCode.length > 0 && (
            <p className="text-[10px] text-mesh-muted-dim font-mono text-right">
              {sourceCode.length} chars | {sourceCode.split('\n').length} lines
            </p>
          )}
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-2.5 animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {validationError}
        </div>
      )}

      {/* Backend Error */}
      {error && !validationError && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-2.5 animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isRunning}
        className={`w-full btn-primary ${isRunning ? 'opacity-60 cursor-wait' : ''}`}
      >
        {isRunning ? (
          <span className="flex items-center justify-center gap-3">
            <span className="w-4 h-4 border-2 border-mesh-bg/20 border-t-mesh-bg rounded-full animate-spin" />
            <span>Analyzing Contract...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Start Security Audit
          </span>
        )}
      </button>

      {/* Status */}
      {auditStatus && auditStatus !== 'started' && (
        <p className="text-xs text-center text-mesh-muted animate-fade-in">
          Status: <span className="text-mesh-accent-light font-mono">{auditStatus}</span>
        </p>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-mesh-bg/40 border border-mesh-border/50 p-3.5">
        <div className="w-6 h-6 rounded-lg bg-mesh-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3.5 h-3.5 text-mesh-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </div>
        <p className="text-[11px] text-mesh-muted leading-relaxed">
          <span className="font-medium" style={{ color: '#B8B2A4' }}>4 specialized agents</span> (reentrancy, access control, logic, economic) analyze your contract
          via the <span className="text-mesh-accent-light font-mono text-[10px]">Gensyn AXL</span> P2P mesh, then reach consensus with weighted voting.
          Results are attested on-chain.
        </p>
      </div>
    </div>
  );
}
