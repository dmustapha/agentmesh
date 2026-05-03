// File: packages/frontend/src/app/page.tsx
'use client';

import { useState } from 'react';
import { TopologyGraph } from '@/components/TopologyGraph';
import { AuditConsole } from '@/components/AuditConsole';
import { AgentCard } from '@/components/AgentCard';
import { ChatFeed } from '@/components/ChatFeed';
import { ReportView } from '@/components/ReportView';
import { Nav } from '@/components/Nav';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAgents } from '@/hooks/useAgents';
import { useAudit } from '@/hooks/useAudit';

const TABS = [
  { key: 'topology', label: 'Mesh Topology', icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5' },
  { key: 'audit', label: 'Audit Console', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
  { key: 'report', label: 'Report', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function Home() {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || (
    typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001/ws`
      : 'ws://localhost:3001/ws'
  );
  const { events, connected } = useWebSocket(wsUrl);
  const { agents, topology } = useAgents(events);
  const { audit, report, startAudit, messages, findings, error: auditError } = useAudit(events);
  const [activeTab, setActiveTab] = useState<TabKey>('topology');

  return (
    <div className="min-h-screen flex flex-col">
      <Nav connected={connected} />

      {/* Hero Section */}
      <header className="relative overflow-hidden border-b border-mesh-border/50">
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-mesh-gradient" />
        <div className="absolute inset-0 bg-mesh-gradient-2" />
        <div className="absolute bottom-0 left-0 right-0 gold-line" />

        <div className="relative max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-start justify-between">
            <div className="animate-fade-in-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="px-2.5 py-1 rounded-lg bg-mesh-accent/10 border border-mesh-accent/20">
                  <span className="text-[10px] text-mesh-accent-light font-semibold uppercase tracking-wider">Decentralized Security</span>
                </div>
                <div className="h-4 w-px bg-mesh-border" />
                <span className="text-[10px] text-mesh-muted font-mono">v1.0</span>
              </div>

              <h1 className="text-5xl font-serif font-bold tracking-tight mb-3">
                <span className="text-mesh-accent-light" style={{ textShadow: '0 0 40px rgba(212,168,83,0.3)' }}>AgentMesh</span>
              </h1>
              <p className="text-base text-mesh-muted max-w-xl leading-relaxed" style={{ color: '#B8B2A4' }}>
                Decentralized AI agent infrastructure for smart contract security.
                P2P communication, on-chain attestations, multi-agent consensus.
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2 group">
                  <span className="relative w-2 h-2 rounded-full bg-mesh-red">
                    <span className="absolute inset-0 rounded-full bg-mesh-red animate-ping opacity-30" />
                  </span>
                  <span className="text-red-400 font-semibold text-sm font-mono">$3.8B</span>
                  <span className="text-mesh-muted text-xs">lost to exploits</span>
                </div>
                <div className="h-4 w-px bg-mesh-border" />
                <div className="flex items-center gap-2">
                  <span className="relative w-2 h-2 rounded-full bg-mesh-green">
                    {connected && <span className="absolute inset-0 rounded-full bg-mesh-green animate-ping opacity-30" />}
                  </span>
                  <span className="text-green-400 font-semibold text-sm font-mono">{agents.length}</span>
                  <span className="text-mesh-muted text-xs">agents online</span>
                </div>
                <div className="h-4 w-px bg-mesh-border" />
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-mesh-accent" />
                  <span className="text-mesh-accent-light font-semibold text-sm font-mono">P2P</span>
                  <span className="text-mesh-muted text-xs">Gensyn AXL mesh</span>
                </div>
              </div>
            </div>

            {/* Sponsor Badges */}
            <div className="hidden lg:flex flex-col items-end gap-2 animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <span className="text-[9px] text-mesh-muted uppercase tracking-wider font-medium mb-1">Powered By</span>
              {['Gensyn AXL', 'ENS', '0G Labs'].map((name, i) => (
                <span
                  key={name}
                  className="px-3 py-1.5 rounded-lg bg-mesh-card/60 backdrop-blur-sm border border-mesh-border/50 text-[11px] text-mesh-muted font-medium hover:border-mesh-accent/30 hover:text-mesh-accent-light transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${i * 100 + 400}ms`, animationFillMode: 'both' }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto w-full px-6">
        <nav className="flex gap-0.5 pt-4 pb-0">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative px-5 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-300 flex items-center gap-2 ${
                activeTab === key
                  ? 'bg-mesh-card/80 backdrop-blur-sm border border-mesh-border border-b-transparent text-mesh-accent-light -mb-px z-10'
                  : 'text-mesh-muted hover:text-gray-300 hover:bg-white/[0.02]'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              {label}
              {key === 'report' && report && (
                <span className="w-1.5 h-1.5 rounded-full bg-mesh-green ml-1" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        <ErrorBoundary>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Primary Panel */}
          <div className="lg:col-span-8 animate-fade-in">
            {activeTab === 'topology' && (
              <TopologyGraph agents={agents} topology={topology} messages={messages} />
            )}
            {activeTab === 'audit' && (
              <AuditConsole onSubmit={startAudit} auditStatus={audit?.status} error={auditError} />
            )}
            {activeTab === 'report' && report && <ReportView report={report} />}
            {activeTab === 'report' && !report && (
              <div className="glass-card p-12 text-center animate-fade-in">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-mesh-accent/5 border border-mesh-border flex items-center justify-center">
                  <svg className="w-7 h-7 text-mesh-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-mesh-muted text-sm font-medium">No audit report yet</p>
                <p className="text-mesh-muted-dim text-xs mt-1">Submit a contract to begin analysis</p>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-mesh-accent hover:text-mesh-accent-light hover:bg-mesh-accent/5 transition-all duration-300 border border-mesh-accent/20 hover:border-mesh-accent/40"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                  Start an audit
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-5">
            {/* Agents Section */}
            <div>
              <h2 className="section-title mb-3 flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                Agents
                <span className="text-[10px] text-mesh-muted font-mono ml-auto normal-case tracking-normal">{agents.length} active</span>
              </h2>
              <div className="space-y-2">
                {agents.map((agent, i) => (
                  <div key={agent.id} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
                    <AgentCard agent={agent} />
                  </div>
                ))}
                {agents.length === 0 && (
                  <div className="glass-card p-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-mesh-accent animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-mesh-accent animate-pulse" style={{ animationDelay: '200ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-mesh-accent animate-pulse" style={{ animationDelay: '400ms' }} />
                    </div>
                    <p className="text-mesh-muted text-xs mt-3">Discovering agents on mesh...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Feed */}
            <div>
              <h2 className="section-title mb-3 flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Agent Communication
                {messages.length > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-mesh-accent font-mono normal-case tracking-normal">
                    <span className="w-1 h-1 rounded-full bg-mesh-accent animate-pulse" />
                    live
                  </span>
                )}
              </h2>
              <ChatFeed messages={messages} agents={agents} />
            </div>

            {/* Live Findings */}
            {findings.length > 0 && (
              <div className="animate-fade-in">
                <h2 className="section-title mb-3 flex items-center gap-2">
                  <svg className="w-3 h-3 text-mesh-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                  </svg>
                  Live Findings
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-mesh-red/15 text-red-400 text-[10px] font-bold">
                    {findings.length}
                  </span>
                </h2>
                <div className="glass-card p-3 space-y-2 max-h-48 overflow-y-auto">
                  {findings.map((f, i) => (
                    <div key={i} className="text-xs border-b border-mesh-border/30 pb-2 last:border-0 last:pb-0 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">{f.title}</span>
                        <span className={`badge-${f.severity.toLowerCase()}`}>{f.severity}</span>
                      </div>
                      <p className="text-mesh-muted mt-0.5 truncate">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
        </ErrorBoundary>
      </main>
    </div>
  );
}
