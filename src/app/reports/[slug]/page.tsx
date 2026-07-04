"use client";

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Report {
  slug: string;
  title: string;
  content_md: string;
  published_at: string;
}

export default function ReportDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/reports/${slug}`);
        if (!res.ok) throw new Error('Report not found');
        const data = await res.json();
        setReport(data.report);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen rs-page theme-reports flex items-center justify-center">
        <div className="w-12 h-12 border-[3px] rounded-full animate-spin" style={{ borderColor: 'hsl(var(--rs-accent) / 0.3)', borderTopColor: 'hsl(var(--rs-accent))' }} />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen rs-page theme-reports flex flex-col items-center justify-center text-center px-4">
        <span className="text-4xl mb-4 block">⚠️</span>
        <h1 className="text-2xl font-bold text-white mb-2">Report Not Found</h1>
        <p className="mb-6" style={{ color: 'var(--rs-text-secondary)' }}>The requested report could not be found.</p>
        <Link href="/reports" className="transition-colors" style={{ color: 'hsl(var(--rs-accent))' }}>
          ← Back to Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen rs-page theme-reports pt-24 pb-16 px-4">
      <article className="max-w-3xl mx-auto">
        <Link href="/reports" className="inline-flex items-center text-sm font-medium transition-colors mb-8 hover:text-white" style={{ color: 'var(--rs-text-muted)' }}>
          <span className="mr-2">←</span> Back to Reports
        </Link>
        
        <header className="mb-10 pb-10 border-b" style={{ borderColor: 'var(--rs-border)' }}>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            {report.title}
          </h1>
          <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--rs-text-secondary)' }}>
            <time dateTime={report.published_at}>
              {new Date(report.published_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="rs-badge-dot" />
              AI Generated
            </span>
          </div>
        </header>

        <div className="prose prose-invert max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-p:leading-relaxed" style={{ color: 'var(--rs-text-secondary)' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {report.content_md}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
