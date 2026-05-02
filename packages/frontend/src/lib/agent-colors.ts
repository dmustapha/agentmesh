// Single source of truth for agent specialty colors across all components
export const SPECIALTY_COLORS: Record<string, string> = {
  reentrancy: '#ef4444',
  'access-control': '#3b82f6',
  logic: '#eab308',
  economic: '#22c55e',
};

export const SPECIALTY_TEXT_COLORS: Record<string, string> = {
  reentrancy: 'text-red-400',
  'access-control': 'text-blue-400',
  logic: 'text-yellow-400',
  economic: 'text-green-400',
};

export const SPECIALTY_BG_COLORS: Record<string, string> = {
  reentrancy: 'bg-red-400',
  'access-control': 'bg-blue-400',
  logic: 'bg-yellow-400',
  economic: 'bg-green-400',
};

export const SPECIALTY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; glow: string }> = {
  reentrancy: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'R', glow: 'rgba(239,68,68,0.15)' },
  'access-control': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'A', glow: 'rgba(59,130,246,0.15)' },
  logic: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: 'L', glow: 'rgba(234,179,8,0.15)' },
  economic: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: 'E', glow: 'rgba(34,197,94,0.15)' },
};
