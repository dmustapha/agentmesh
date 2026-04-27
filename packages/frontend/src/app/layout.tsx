// File: packages/frontend/src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'AgentMesh - Decentralized AI Agent Infrastructure',
  description: 'Decentralized P2P agent mesh for smart contract security auditing. 4 AI agents discover via ENS, communicate via Gensyn AXL, reason via 0G Compute, and reach consensus on-chain.',
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
      <body className={`${inter.variable} ${jetbrains.variable} font-sans bg-mesh-bg text-white min-h-screen grid-bg`}>
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
