// File: packages/frontend/src/components/AgentCard.tsx
import type { AgentNode } from '@agentmesh/shared';
import { SPECIALTY_CONFIG } from '@/lib/agent-colors';

const STATUS_INDICATORS: Record<string, { dot: string; label: string; active: boolean }> = {
  idle: { dot: 'bg-gray-500', label: 'Idle', active: false },
  booting: { dot: 'bg-yellow-500', label: 'Booting', active: true },
  registered: { dot: 'bg-blue-500', label: 'Registered', active: false },
  analyzing: { dot: 'bg-indigo-500', label: 'Analyzing', active: true },
  debating: { dot: 'bg-purple-500', label: 'Debating', active: true },
  voting: { dot: 'bg-orange-500', label: 'Voting', active: true },
  complete: { dot: 'bg-green-500', label: 'Complete', active: false },
  error: { dot: 'bg-red-500', label: 'Error', active: false },
};

export function AgentCard({ agent }: { agent: AgentNode }) {
  const spec = SPECIALTY_CONFIG[agent.specialty] || SPECIALTY_CONFIG.logic;
  const status = STATUS_INDICATORS[agent.status] || STATUS_INDICATORS.idle;

  return (
    <div
      className="glass-card-hover p-3.5 flex items-center gap-3 group"
      style={status.active ? { boxShadow: `0 0 20px ${spec.glow}` } : undefined}
    >
      {/* Specialty icon with glow */}
      <div className={`relative w-10 h-10 rounded-xl ${spec.bg} ${spec.border} border flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}>
        <span className={`text-sm font-bold font-mono ${spec.color}`}>{spec.icon}</span>
        {status.active && (
          <span className={`absolute inset-0 rounded-xl ${spec.border} border animate-ping opacity-20`} />
        )}
      </div>

      {/* Agent info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate group-hover:text-mesh-accent-light transition-colors duration-300">
            {agent.ensName}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`relative w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`}>
            {status.active && (
              <span className={`absolute inset-0 rounded-full ${status.dot} animate-ping opacity-40`} />
            )}
          </span>
          <span className={`text-[11px] font-medium ${status.active ? 'text-gray-300' : 'text-mesh-muted'}`}>
            {status.label}
          </span>
          <span className="text-[10px] text-mesh-muted-dim font-mono">|</span>
          <span className="text-[11px] text-mesh-muted capitalize font-mono">
            {agent.specialty.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Peer ID with hover reveal */}
      <div className="hidden sm:flex flex-col items-end gap-0.5">
        <span className="text-[9px] text-mesh-muted-dim font-mono opacity-60 group-hover:opacity-100 transition-opacity duration-300">
          {agent.peerId.slice(0, 8)}
        </span>
        <span className="text-[9px] text-mesh-muted-dim font-mono opacity-0 group-hover:opacity-60 transition-opacity duration-300">
          ...{agent.peerId.slice(-6)}
        </span>
      </div>
    </div>
  );
}
