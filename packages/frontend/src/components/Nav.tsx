// File: packages/frontend/src/components/Nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1' },
  { href: '/proof', label: 'Proof', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

export function Nav({ connected: connectedProp }: { connected?: boolean }) {
  const pathname = usePathname();
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    if (connectedProp !== undefined) return; // parent controls it
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws');
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    return () => ws.close();
  }, [connectedProp]);

  const connected = connectedProp !== undefined ? connectedProp : wsConnected;

  return (
    <nav className="border-b border-mesh-border/60 bg-mesh-bg/60 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Animated logo */}
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-mesh-accent to-mesh-cyan opacity-80 group-hover:opacity-100 transition-opacity duration-300 animate-breathe-slow" />
              <div className="relative w-full h-full rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold tracking-tight">AM</span>
              </div>
            </div>
            <span className="text-sm font-semibold text-white group-hover:text-mesh-accent-light transition-colors duration-300">
              AgentMesh
            </span>
          </Link>

          <div className="flex items-center gap-0.5">
            {NAV_ITEMS.map(({ href, label, icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                    isActive
                      ? 'text-white bg-mesh-accent/10 tab-active'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Connection status with animated pulse */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-mesh-card/50 border border-mesh-border/50">
            <span className={`relative w-2 h-2 rounded-full transition-colors duration-500 ${
              connected ? 'bg-mesh-green' : 'bg-mesh-red'
            }`}>
              {connected && (
                <span className="absolute inset-0 rounded-full bg-mesh-green animate-ping opacity-30" />
              )}
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>

          <a
            href="https://github.com/dmustapha/agentmesh"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-400 transition-colors duration-300"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Source
          </a>
        </div>
      </div>
    </nav>
  );
}
