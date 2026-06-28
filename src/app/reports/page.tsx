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
    <div className="min-h-screen rs-page theme-reports pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI-Generated
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Weekly Reports</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Automated insights covering the biggest movers and overall top brands in Indian AI visibility, written by Large Language Models.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-[3px] border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400">⚠️ {error}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
            <span className="text-4xl mb-4 block">📭</span>
            <h3 className="text-xl font-semibold text-white mb-2">No Reports Yet</h3>
            <p className="text-gray-500 text-sm">The first weekly report hasn't been generated yet. Run the pipeline script to create one.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <Link 
                key={report.slug} 
                href={`/reports/${report.slug}`}
                className="block group"
              >
                <article className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 sm:p-8 hover:bg-white/[0.04] transition-all hover:border-blue-500/30">
                  <div className="text-sm text-blue-400 font-medium mb-3">
                    {new Date(report.published_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">
                    {report.title}
                  </h2>
                  <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
                    {report.snippet}
                  </p>
                  <div className="mt-6 flex items-center text-sm text-gray-500 font-medium group-hover:text-blue-400 transition-colors">
                    Read Full Report <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
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
