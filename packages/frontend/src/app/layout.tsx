// File: packages/frontend/src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentMesh - Decentralized AI Agent Infrastructure',
  description: 'Decentralized P2P agent mesh for smart contract security auditing. 4 AI agents discover via ENS, communicate via Gensyn AXL, reason via 0G Compute, and reach consensus on-chain.',
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: 'AgentMesh',
    description: 'Decentralized P2P agent mesh for smart contract security auditing',
    type: 'website',
  },
  robots: 'index, follow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-mesh-bg text-white min-h-screen grid-bg">
        {/* Ambient floating particles */}
        <div className="particles" aria-hidden="true">
          <div className="particle" style={{ left: '10%' }} />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
