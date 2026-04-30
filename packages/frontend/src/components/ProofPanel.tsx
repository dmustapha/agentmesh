// File: packages/frontend/src/components/ProofPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { fetchProof } from '@/lib/api';

interface ProofData {
  agents: Array<{ name: string; peerId: string; specialty: string; status: string }>;
  contracts: { agentRegistry: string; auditAttestation: string; explorerBase: string };
  ens: { network: string; parentName: string; subnames: string[] };
  topology: Record<string, { peerId: string; peers: string[] }>;
}

const SPECIALTY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  reentrancy: { text: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/15' },
  'access-control': { text: 'text-blue-400', bg: 'bg-blue-500/8', border: 'border-blue-500/15' },
  logic: { text: 'text-yellow-400', bg: 'bg-yellow-500/8', border: 'border-yellow-500/15' },
  economic: { text: 'text-green-400', bg: 'bg-green-500/8', border: 'border-green-500/15' },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="text-[10px] text-gray-600 hover:text-mesh-accent transition-colors duration-300 font-mono"
    >
      {copied ? 'copied' : 'copy'}
    </button>
  );
}

export function ProofPanel() {
  const [proof, setProof] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProof()
      .then(setProof)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Skeleton loading */}
        <div className="space-y-3">
          <div className="skeleton h-4 w-48" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
        <div className="space-y-3">
          <div className="skeleton h-4 w-56" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!proof) {
    return (
      <div className="glass-card p-12 text-center animate-fade-in">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-mesh-red/10 border border-mesh-red/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-mesh-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
        </div>
        <p className="text-sm text-gray-400 font-medium">Could not load proof data</p>
        <p className="text-xs text-gray-600 mt-1">Is the backend running on port 3001?</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Agents */}
      <section className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        <h3 className="section-title mb-4 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-mesh-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          Registered Agents (ENS Sepolia)
        </h3>
        <div className="grid gap-2">
          {proof.agents.map((a, i) => {
            const spec = SPECIALTY_COLORS[a.specialty] || SPECIALTY_COLORS.logic;
            return (
              <div
                key={a.name}
                className="glass-card-hover p-4 flex items-center justify-between animate-slide-up"
                style={{ animationDelay: `${i * 80 + 200}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${spec.bg} ${spec.border} border flex items-center justify-center`}>
                    <span className={`text-xs font-bold font-mono ${spec.text}`}>
                      {a.specialty[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className={`text-sm font-semibold ${spec.text}`}>{a.name}</span>
                    <p className="text-[10px] text-gray-600 capitalize mt-0.5">{a.specialty.replace('-', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-600">
                    {a.peerId.slice(0, 12)}...{a.peerId.slice(-6)}
                  </span>
                  <CopyButton text={a.peerId} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contracts */}
      <section className="animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
        <h3 className="section-title mb-4 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-mesh-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          Smart Contracts (0G Chain Testnet 16602)
        </h3>
        <div className="space-y-3">
          {[
            { label: 'AgentRegistry', address: proof.contracts.agentRegistry },
            { label: 'AuditAttestation', address: proof.contracts.auditAttestation },
          ].map(({ label, address }, i) => (
            <div
              key={label}
              className="glass-card p-4 animate-slide-up"
              style={{ animationDelay: `${i * 100 + 400}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <CopyButton text={address} />
              </div>
              <a
                href={`${proof.contracts.explorerBase}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-mesh-accent hover:text-mesh-accent-light transition-colors duration-300 underline underline-offset-2 break-all"
              >
                {address}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Topology */}
      <section className="animate-fade-in-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
        <h3 className="section-title mb-4 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-mesh-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          AXL Mesh Topology
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(proof.topology).map(([specialty, data], i) => {
            const spec = SPECIALTY_COLORS[specialty] || SPECIALTY_COLORS.logic;
            return (
              <div
                key={specialty}
                className={`glass-card p-4 ${spec.border} border animate-scale-in`}
                style={{ animationDelay: `${i * 80 + 600}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold capitalize ${spec.text}`}>
                    {specialty.replace('-', ' ')}
                  </p>
                  <span className="text-[10px] text-gray-600 font-mono">
                    {data.peers.length} peer{data.peers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[9px] font-mono text-gray-700 mt-2 truncate">
                  {data.peerId}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ENS */}
      {proof.ens && (
        <section className="animate-fade-in-up" style={{ animationDelay: '700ms', animationFillMode: 'both' }}>
          <h3 className="section-title mb-4 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-mesh-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
            </svg>
            ENS Configuration
          </h3>
          <div className="glass-card p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Network</span>
              <span className="text-gray-300 font-mono text-xs">{proof.ens.network}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Parent Name</span>
              <span className="text-mesh-accent font-mono text-xs">{proof.ens.parentName}</span>
            </div>
            {proof.ens.subnames.length > 0 && (
              <div className="pt-3 border-t border-mesh-border/50">
                <p className="text-[10px] text-gray-600 mb-2 font-medium uppercase tracking-wide">Subnames (ENSIP-25)</p>
                <div className="flex flex-wrap gap-2">
                  {proof.ens.subnames.map((sn) => (
                    <span
                      key={sn}
                      className="text-[11px] font-mono bg-mesh-accent/8 text-mesh-accent-light px-2.5 py-1 rounded-lg border border-mesh-accent/15 hover:border-mesh-accent/30 transition-colors duration-300"
                    >
                      {sn}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
