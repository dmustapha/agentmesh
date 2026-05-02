// File: packages/frontend/src/app/proof/page.tsx
import { ProofPanel } from '@/components/ProofPanel';
import { Nav } from '@/components/Nav';

export default function ProofPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <header className="relative overflow-hidden border-b border-mesh-border/50">
        <div className="absolute inset-0 bg-mesh-gradient" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-mesh-accent/20 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-6 py-10">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-mesh-accent/10 border border-mesh-accent/20 flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-mesh-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Integration Proof</h1>
                <p className="text-sm text-mesh-muted mt-0.5">
                  Verifiable evidence of deep integration with Gensyn AXL, ENS, and 0G Labs
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <ProofPanel />
      </main>
    </div>
  );
}
