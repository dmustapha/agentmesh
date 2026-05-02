// File: packages/frontend/src/app/report/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ReportView } from '@/components/ReportView';
import { Nav } from '@/components/Nav';
import type { AuditReport } from '@agentmesh/shared';

export default function ReportPage({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/audit/${params.id}`);
        if (res.ok) {
          const data = await res.json() as { report: AuditReport };
          setReport(data.report);
          setLoading(false);
          return;
        }
      } catch { /* backend unavailable */ }

      const cached = sessionStorage.getItem(`report-${params.id}`);
      if (cached) setReport(JSON.parse(cached));
      setLoading(false);
    }
    loadReport();
  }, [params.id]);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <header className="relative overflow-hidden border-b border-mesh-border/50">
        <div className="absolute inset-0 bg-mesh-gradient" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-mesh-accent/20 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-6 py-10">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-mesh-accent/10 border border-mesh-accent/20 flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-mesh-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Audit Report</h1>
                <p className="text-[11px] text-mesh-muted-dim font-mono mt-0.5">{params.id}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {loading && (
          <div className="space-y-4 animate-fade-in">
            <div className="skeleton h-32 w-full" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        )}
        {!loading && !report && (
          <div className="glass-card p-12 text-center animate-fade-in">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-mesh-red/10 border border-mesh-red/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-mesh-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-mesh-muted font-medium">Report not found</p>
            <p className="text-xs text-mesh-muted-dim mt-1">The report may have expired or the backend may be offline.</p>
          </div>
        )}
        {!loading && report && <ReportView report={report} />}
      </main>
    </div>
  );
}
