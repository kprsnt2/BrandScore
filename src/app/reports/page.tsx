"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ReportSnippet {
  slug: string;
  title: string;
  published_at: string;
  snippet: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch('/api/reports');
        if (!res.ok) throw new Error('Failed to fetch reports');
        const data = await res.json();
        setReports(data.reports || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  return (
    <div className="min-h-screen rs-page pt-24 pb-16 px-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[10%] left-[25%] w-[300px] h-[300px] rounded-full bg-indigo-500/[0.02] blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[25%] w-[300px] h-[300px] rounded-full bg-purple-500/[0.02] blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-12 relative z-10 animate-fade-in">
        <header className="rs-hero text-center">
          <div className="rs-badge mx-auto mb-4 hover:scale-105 transition-all duration-300">
            <span className="rs-badge-dot bg-indigo-400" />
            AI-Generated Intelligence
          </div>
          <h1 className="text-4xl sm:text-6xl font-black mb-4 text-white tracking-tight leading-none">
            Weekly <span className="gradient-text">Reports</span>
          </h1>
          <p style={{ color: 'var(--rs-text-secondary)' }} className="max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Automated intelligence reports mapping the biggest market shifts and overall top brand visibility rankings across Indian commerce.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400 font-medium">⚠️ {error}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 rs-card border-white/[0.06] bg-[#16181d]/50 max-w-lg mx-auto">
            <span className="text-4xl mb-4 block">📭</span>
            <h3 className="text-xl font-bold text-white mb-2">No Reports Available</h3>
            <p className="text-xs sm:text-sm px-6" style={{ color: 'var(--rs-text-muted)' }}>
              The weekly pipeline runs haven&apos;t generated reports yet. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report, idx) => (
              <Link 
                key={report.slug} 
                href={`/reports/${report.slug}`}
                className="block group"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <article className="rs-card p-6 sm:p-8 bg-[#16181d]/40 border-white/[0.06] hover:border-indigo-500/30 transition-all duration-300 backdrop-blur-sm relative overflow-hidden">
                  {/* Styled side stripe */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-30 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="rs-badge border-indigo-500/10 bg-indigo-500/5 text-indigo-400 font-bold" style={{ fontSize: '0.7rem' }}>
                      📅 {new Date(report.published_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 bg-white/[0.02] border border-white/[0.04] px-2 py-0.5 rounded">
                      5 Min Read
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors tracking-tight">
                    {report.title}
                  </h2>
                  <p className="leading-relaxed text-xs sm:text-sm" style={{ color: 'var(--rs-text-secondary)' }}>
                    {report.snippet}
                  </p>
                  
                  <div className="mt-6 flex items-center text-xs sm:text-sm font-bold uppercase tracking-wider text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    <span>Read Full Intelligence Report</span>
                    <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
