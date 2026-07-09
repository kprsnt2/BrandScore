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
    <div className="min-h-screen rs-page pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="rs-hero text-center">
          <div className="rs-badge mx-auto mb-4">
            <span className="rs-badge-dot" />
            AI-Generated
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Weekly Reports</h1>
          <p style={{ color: 'var(--rs-text-secondary)' }} className="max-w-2xl mx-auto">
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
          <div className="text-center py-20 rs-card">
            <span className="text-4xl mb-4 block">📭</span>
            <h3 className="text-xl font-semibold text-white mb-2">No Reports Yet</h3>
            <p className="text-sm" style={{ color: 'var(--rs-text-muted)' }}>The first weekly report hasn't been generated yet. Run the pipeline script to create one.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <Link 
                key={report.slug} 
                href={`/reports/${report.slug}`}
                className="block group"
              >
                <article className="rs-card p-6 sm:p-8">
                  <div className="rs-badge mb-3" style={{ fontSize: '0.75rem' }}>
                    {new Date(report.published_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-primary-300 transition-colors">
                    {report.title}
                  </h2>
                  <p className="leading-relaxed text-sm sm:text-base" style={{ color: 'var(--rs-text-secondary)' }}>
                    {report.snippet}
                  </p>
                  <div className="mt-6 flex items-center text-sm font-medium transition-colors" style={{ color: 'var(--rs-text-muted)' }}>
                    <span className="group-hover:text-primary-400 transition-colors">Read Full Report</span>
                    <span className="ml-2 group-hover:translate-x-1 transition-transform group-hover:text-primary-400">→</span>
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
