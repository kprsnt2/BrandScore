"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Report {
  slug: string;
  title: string;
  content_md: string;
  published_at: string;
}

export default function ReportDetailPage({ params }: { params: { slug: string } }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/reports/${params.slug}`);
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
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-12 h-12 border-[3px] border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-center px-4">
        <span className="text-4xl mb-4 block">⚠️</span>
        <h1 className="text-2xl font-bold text-white mb-2">Report Not Found</h1>
        <p className="text-gray-400 mb-6">The requested report could not be found.</p>
        <Link href="/reports" className="text-blue-400 hover:text-blue-300">
          ← Back to Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-24 pb-16 px-4">
      <article className="max-w-3xl mx-auto">
        <Link href="/reports" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-white transition-colors mb-8">
          <span className="mr-2">←</span> Back to Reports
        </Link>
        
        <header className="mb-10 pb-10 border-b border-white/[0.05]">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            {report.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
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
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              AI Generated
            </span>
          </div>
        </header>

        <div className="prose prose-invert prose-blue max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-p:text-gray-300 prose-p:leading-relaxed prose-a:text-blue-400 prose-li:text-gray-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {report.content_md}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
