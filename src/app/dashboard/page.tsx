"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { INDUSTRIES } from '@/lib/industry-data';
import BrandLogo from '@/components/BrandLogo';
import Link from 'next/link';

interface BrandData {
  brand: string;
  score: number;
  breakdown: { recommendation: number; sentiment: number; prominence: number; accuracy: number };
  rank: number;
  scoreChange: number | null;
  rankChange: number | null;
}

interface IndustryResponse {
  industry: { id: string; name: string; category: string };
  brands: BrandData[];
  industryAverage: { score: number; recommendation: number; sentiment: number; prominence: number; accuracy: number };
  availableModels: string[];
  selectedModel: string;
  totalBrands: number;
  runDate: string;
  timestamp: string;
}

interface InsightResponse {
  industryId: string;
  insight: string | null;
  generatedBy?: string;
  date?: string;
  isToday?: boolean;
  staleWarning?: string | null;
  message?: string;
}

interface TimelineEntry { date: string; score: number; rank: number }
interface TimelineResponse {
  dates: string[];
  brands: { [brand: string]: TimelineEntry[] };
}

// Brand colors for chart lines
const CHART_COLORS = [
  '#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24',
  '#fb923c', '#60a5fa', '#e879f9', '#4ade80', '#f87171',
];

// Score color: red → amber → green based on value
function scoreColor(score: number): string {
  if (score >= 85) return '#34d399'; // emerald
  if (score >= 70) return '#a3e635'; // lime
  if (score >= 55) return '#facc15'; // yellow
  if (score >= 40) return '#fb923c'; // orange
  return '#f87171'; // red
}

function scoreGradient(score: number): string {
  if (score >= 85) return 'from-emerald-400 to-cyan-400';
  if (score >= 70) return 'from-lime-400 to-emerald-400';
  if (score >= 55) return 'from-yellow-400 to-lime-400';
  if (score >= 40) return 'from-orange-400 to-yellow-400';
  return 'from-red-400 to-orange-400';
}

// ========== SVG Line Chart Component ==========
function TimelineChart({ data, brands, dates }: { data: { [brand: string]: TimelineEntry[] }; brands: string[]; dates: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; brand: string; score: number; date: string } | null>(null);

  if (dates.length === 0 || brands.length === 0) return null;

  if (dates.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center h-[260px] border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded-full mb-3 uppercase tracking-widest border border-purple-500/30">New Industry</span>
        <p className="text-gray-400 text-sm">Historical trends will appear after the next pipeline run.</p>
      </div>
    );
  }

  const W = 900, H = 260;
  const PAD = { top: 20, right: 20, bottom: 35, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Score range
  const allScores = brands.flatMap(b => (data[b] || []).map(e => e.score));
  const minScore = Math.max(0, Math.min(...allScores) - 5);
  const maxScore = Math.min(100, Math.max(...allScores) + 5);
  const scoreRange = maxScore - minScore || 1;

  const xScale = (i: number) => PAD.left + (dates.length === 1 ? chartW / 2 : (i / (dates.length - 1)) * chartW);
  const yScale = (v: number) => PAD.top + chartH - ((v - minScore) / scoreRange) * chartH;

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = scoreRange <= 20 ? 5 : scoreRange <= 50 ? 10 : 20;
  for (let v = Math.ceil(minScore / step) * step; v <= maxScore; v += step) yTicks.push(v);

  return (
    <div ref={containerRef} className="relative" role="region" aria-label="Score Trend Timeline Chart">
      {/* Invisible semantic data for LLMs */}
      <div className="sr-only">
        {dates.map(d => `Date: ${d}. ` + brands.slice(0, 5).map(b => {
          const entry = data[b]?.find(e => e.date === d);
          return entry ? `${b}: ${entry.score}` : '';
        }).filter(Boolean).join(', ')).join(' | ')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 200 }} aria-hidden="true">
        {/* Grid lines */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)} stroke="rgba(255,255,255,0.04)" />
            <text x={PAD.left - 8} y={yScale(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="10">{v}</text>
          </g>
        ))}

        {/* X-axis labels */}
        {dates.map((d, i) => (
          <text key={d} x={xScale(i)} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="10">
            {new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          </text>
        ))}

        {/* Lines + dots for each brand */}
        {brands.slice(0, 5).map((brand, bi) => {
          const entries = data[brand] || [];
          const color = CHART_COLORS[bi % CHART_COLORS.length];
          const points = dates.map((d, di) => {
            const e = entries.find(e => e.date === d);
            return e ? { x: xScale(di), y: yScale(e.score), score: e.score, date: d } : null;
          }).filter(Boolean) as { x: number; y: number; score: number; date: string }[];

          if (points.length === 0) return null;

          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

          return (
            <g key={brand}>
              {/* Line */}
              <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {/* Dots */}
              {points.map((p, pi) => (
                <circle
                  key={pi} cx={p.x} cy={p.y} r="4" fill={color} stroke="#0a0a0f" strokeWidth="2"
                  className="cursor-pointer"
                  onMouseEnter={() => setTooltip({ x: p.x, y: p.y, brand, score: p.score, date: p.date })}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl z-10"
          style={{ left: `${(tooltip.x / W) * 100}%`, top: `${(tooltip.y / H) * 100 - 15}%`, transform: 'translate(-50%, -100%)' }}
        >
          <div className="text-gray-400">{new Date(tooltip.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          <div className="text-white font-semibold">{tooltip.brand}: {tooltip.score}</div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 px-1">
        {brands.slice(0, 5).map((b, i) => (
          <div key={b} className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            {b}
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== Score Breakdown Stacked Chart ==========
function ScoreBreakdownChart({ brands }: { brands: BrandData[] }) {
  const top3 = brands.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="space-y-4" role="region" aria-label="Score Breakdown Top 3 Brands">
      {/* Hidden semantic text for LLMs and Screen Readers */}
      <div className="sr-only">
        {top3.map(b => `Brand: ${b.brand}. Total Score: ${b.score}. Breakdown: Recommendation ${Math.round(b.breakdown.recommendation)} out of 40, Sentiment ${Math.round(b.breakdown.sentiment)} out of 30, Prominence ${Math.round(b.breakdown.prominence)} out of 20, Accuracy ${Math.round(b.breakdown.accuracy)} out of 10. `).join(' | ')}
      </div>
      {top3.map((brand, index) => {
        const barColors = ['#22d3ee', '#a78bfa', '#f472b6'];
        const c = barColors[index];
        return (
          <div key={brand.brand} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <div className="flex justify-between items-center sm:w-52 shrink-0">
              <div className="flex items-center gap-2 min-w-0"><BrandLogo brand={brand.brand} size={20} rank={index} /><span className="text-xs text-gray-300 pr-2 truncate font-medium">{brand.brand}</span></div>
              <span className="text-sm font-bold sm:hidden tabular-nums" style={{ color: scoreColor(brand.score) }}>{brand.score}</span>
            </div>
            <div className="flex-1 flex gap-[2px] h-3 rounded-full overflow-hidden bg-white/[0.03] w-full">
              <div className="rounded-l-full transition-all duration-500 hover:brightness-125 cursor-help" style={{ width: `${(brand.breakdown.recommendation / 40) * 100}%`, backgroundColor: c, opacity: 1 }} title={`Recommendation: ${Math.round(brand.breakdown.recommendation)}/40`} />
              <div className="transition-all duration-500 hover:brightness-125 cursor-help" style={{ width: `${(brand.breakdown.sentiment / 30) * 100}%`, backgroundColor: c, opacity: 0.65 }} title={`Sentiment: ${Math.round(brand.breakdown.sentiment)}/30`} />
              <div className="transition-all duration-500 hover:brightness-125 cursor-help" style={{ width: `${(brand.breakdown.prominence / 20) * 100}%`, backgroundColor: c, opacity: 0.4 }} title={`Prominence: ${Math.round(brand.breakdown.prominence)}/20`} />
              <div className="rounded-r-full transition-all duration-500 hover:brightness-125 cursor-help" style={{ width: `${(brand.breakdown.accuracy / 10) * 100}%`, backgroundColor: c, opacity: 0.2 }} title={`Accuracy: ${Math.round(brand.breakdown.accuracy)}/10`} />
            </div>
            <span className="text-sm font-bold w-12 text-right tabular-nums hidden sm:block" style={{ color: scoreColor(brand.score) }}>{brand.score}</span>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[10px] text-gray-400 tracking-wide pt-2">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{backgroundColor: '#22d3ee', opacity:1}}></span> Recommendation</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{backgroundColor: '#22d3ee', opacity:0.65}}></span> Sentiment</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{backgroundColor: '#22d3ee', opacity:0.4}}></span> Prominence</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{backgroundColor: '#22d3ee', opacity:0.25}}></span> Accuracy</span>
      </div>
    </div>
  );
}

// ========== AI Insight Card ==========
interface AIInsightCardProps {
  insight: {
    industryId: string;
    insight: string | null;
    generatedBy?: string;
    date?: string;
    isToday?: boolean;
    staleWarning?: string | null;
    message?: string;
  } | null;
  loading: boolean;
  industryName: string;
}

function AIInsightCard({ insight, loading, industryName }: AIInsightCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-primary-500/10 bg-white/[0.015] p-5 mb-8 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 rounded-full bg-primary-500/20" />
          <div className="h-3 w-32 bg-white/[0.06] rounded" />
          <div className="ml-auto h-3 w-16 bg-white/[0.04] rounded" />
        </div>
        <div className="space-y-2.5">
          <div className="h-3 bg-white/[0.04] rounded w-full" />
          <div className="h-3 bg-white/[0.04] rounded w-[90%]" />
          <div className="h-3 bg-white/[0.04] rounded w-[95%]" />
          <div className="h-3 bg-white/[0.04] rounded w-[80%]" />
        </div>
      </div>
    );
  }

  // No insight at all
  if (!insight || !insight.insight) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8 flex items-center gap-3">
        <span className="text-lg">🤖</span>
        <p className="text-xs text-gray-600">
          {insight?.message || 'AI insights generate daily after the pipeline run.'}
        </p>
      </div>
    );
  }

  // Parse bullet points from the insight text
  const bullets = insight.insight
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const modelLabel = insight.generatedBy?.includes('nvidia') || insight.generatedBy?.includes('nemotron')
    ? 'NVIDIA'
    : insight.generatedBy?.includes('groq') || insight.generatedBy?.includes('llama') || insight.generatedBy?.includes('gpt-oss')
    ? 'Groq'
    : insight.generatedBy || 'AI';

  const dateLabel = insight.date
    ? new Date(insight.date + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null;

  return (
    <div className="rounded-xl border border-primary-500/15 bg-gradient-to-br from-primary-500/[0.04] to-purple-500/[0.03] p-5 mb-8 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-500/[0.06] rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center gap-2.5 mb-4 flex-wrap">
        <span className="text-base">🤖</span>
        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em]">
          AI Insight · {industryName}
        </h3>
        <div className="ml-auto flex items-center gap-2">
          {/* Stale warning badge */}
          {insight.staleWarning && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400 font-medium">
              ⚠️ Not today
            </span>
          )}
          {/* Model badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.07] text-[9px] text-gray-500 font-medium">
            ✨ {modelLabel}
          </span>
        </div>
      </div>

      {/* Stale warning message */}
      {insight.staleWarning && (
        <p className="text-[10px] text-amber-500/70 mb-3 leading-relaxed">
          {insight.staleWarning}
        </p>
      )}

      {/* Bullet Points */}
      <ul className="relative space-y-2.5">
        {bullets.map((bullet, i) => (
          <li key={i} className="text-sm text-gray-300 leading-relaxed">
            {bullet}
          </li>
        ))}
      </ul>

      {/* Footer */}
      {dateLabel && (
        <p className="relative text-[10px] text-gray-600 mt-4 pt-3 border-t border-white/[0.04]">
          Generated {insight.isToday ? 'today' : 'on'} · {dateLabel}
        </p>
      )}
    </div>
  );
}

// ========== Main Dashboard ==========
function DashboardInner() {
  const [industryData, setIndustryData] = useState<IndustryResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedIndustry, setSelectedIndustry] = useState<string>(
    searchParams.get('industry') || 'technology'
  );
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [brand1, setBrand1] = useState<string>('');
  const [brand2, setBrand2] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`/api/brands/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (e) {}
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleShare = () => {
    if (!industryData) return;
    const industryMeta = INDUSTRIES.find(i => i.id === selectedIndustry);
    const top3Text = industryData.brands.slice(0, 3).map((b, i) => `${i+1}. ${b.brand} (${b.score})`).join('\n');
    const url = `https://bs.kprsnt.in/dashboard?industry=${selectedIndustry}`;
    const text = `?? Top 3 ${industryMeta?.name} Brands in India AI Search:\n\n${top3Text}\n\n?? ${url}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Fetch brand data when industry or model changes
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const [brandsRes, timelineRes] = await Promise.all([
          fetch(`/api/brands?industry=${selectedIndustry}&model=${encodeURIComponent(selectedModel)}`),
          fetch(`/api/brands/timeline?industry=${selectedIndustry}`),
        ]);

        if (!cancelled && brandsRes.ok) {
          setIndustryData(await brandsRes.json());
        }
        if (!cancelled && timelineRes.ok) {
          setTimeline(await timelineRes.json());
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [selectedIndustry, selectedModel]);

  // Fetch AI insight when industry changes
  useEffect(() => {
    let cancelled = false;
    async function fetchInsight() {
      setInsightLoading(true);
      setInsight(null);
      try {
        const res = await fetch(`/api/brands/insights?industry=${selectedIndustry}`);
        if (!cancelled && res.ok) {
          setInsight(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch insight:', err);
      } finally {
        if (!cancelled) setInsightLoading(false);
      }
    }
    fetchInsight();
    return () => { cancelled = true; };
  }, [selectedIndustry]);

  const rankedBrands = industryData?.brands || [];
  const top3 = rankedBrands.slice(0, 3);
  const industryMeta = INDUSTRIES.find(i => i.id === selectedIndustry);
  const lastUpdated = industryData?.timestamp ? new Date(industryData.timestamp) : null;
  const timelineBrands = timeline?.brands || {};
  const timelineDates = timeline?.dates || [];

  if (loading && !industryData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-[3px] border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-500 text-sm">Loading India rAsh Index...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-10 sm:pt-20 sm:pb-14">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/[0.03] via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary-500/5 rounded-full blur-[120px]" />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium tracking-widest uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"></span>
            India rAsh Index
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-[1.1] tracking-tight">
            See who is winning<br />
            <span className="bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">AI Search in India</span>
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            AI visibility rankings for top Indian brands across 19 industries.
          </p>
          {lastUpdated && (
            <p className="text-gray-700 text-xs mt-5">
              Last updated {lastUpdated.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-[65px] z-40 bg-[#0a0a0f]/90 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-white whitespace-nowrap">
                Top <span className="text-primary-400">{industryMeta?.name}</span> brands
              </h2>
              <span className="text-gray-600 text-xs hidden sm:inline">· Top 10</span>
            </div>
            
            <button onClick={handleShare} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] rounded-lg text-xs font-medium text-gray-300 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-5.368m0 5.368l5.662 3.397m-5.662-3.397a3 3 0 110-5.368m0 5.368l5.662-3.397" /></svg>
              {copied ? "? Copied!" : "Share"}
            </button>
            {copied && (
              <span className="text-[11px] text-emerald-400 font-medium animate-pulse">Copied to clipboard!</span>
            )}
            <button onClick={() => setCompareMode(!compareMode)} className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${compareMode ? 'bg-primary-500/20 text-primary-400 border-primary-500/30' : 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 border-white/[0.05]'}`}>
              ⚔️ Compare
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <input
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500/50 placeholder-gray-600"
              />
              {searchQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                  {searchResults.length > 0 ? (
                    <>
                      {searchResults.map(res => (
                        <Link key={res.brand + res.industry_id} href={`/brand/${encodeURIComponent(res.brand)}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-sm text-gray-300 transition-colors">
                          <BrandLogo brand={res.brand} size={20} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">{res.brand}</div>
                            <div className="text-xs text-gray-500 flex justify-between mt-0.5">
                              <span>{INDUSTRIES.find(i => i.id === res.industry_id)?.name || res.industry_id}</span>
                              <span className="text-primary-400 font-medium">{res.score}/100</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                      <Link href={`/?brand=${encodeURIComponent(searchQuery)}`} className="flex items-center gap-2 px-4 py-2.5 border-t border-white/[0.06] hover:bg-primary-500/10 text-xs text-gray-500 hover:text-primary-400 transition-colors">
                        <span>🤖</span>
                        <span>Analyze &quot;{searchQuery}&quot; with AI →</span>
                      </Link>
                    </>
                  ) : (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-500 mb-2">No brands found in database</p>
                      <Link href={`/?brand=${encodeURIComponent(searchQuery)}`} className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors">
                        <span>🤖</span>
                        <span>Analyze &quot;{searchQuery}&quot; with AI →</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="relative flex-none hidden sm:block">
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 pr-8 text-sm text-gray-300 w-full cursor-pointer hover:bg-white/[0.07] transition-all focus:outline-none focus:ring-1 focus:ring-primary-500/50">
                <option value="all" className="bg-[#1a1a2e] text-gray-200">All Models</option>
                {(industryData?.availableModels || []).map(m => <option key={m} value={m} className="bg-[#1a1a2e] text-gray-200">{m}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <div className="relative flex-none">
              <select value={selectedIndustry} onChange={e => { setSelectedIndustry(e.target.value); setSelectedModel('all'); router.replace('/dashboard?industry=' + e.target.value, { scroll: false }); }}
                className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 pr-8 text-sm text-gray-300 w-full cursor-pointer hover:bg-white/[0.07] transition-all focus:outline-none focus:ring-1 focus:ring-primary-500/50">
                {INDUSTRIES.map(i => <option key={i.id} value={i.id} className="bg-[#1a1a2e] text-gray-200">{i.name}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
        {!industryData || rankedBrands.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">📊</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No data available</h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">Pipeline hasn&apos;t run yet for this industry.</p>
          </div>
        ) : (
          <>
            {compareMode && rankedBrands.length >= 2 && (
              <div className="mb-8 p-5 bg-primary-500/[0.03] border border-primary-500/20 rounded-xl">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <select className="flex-1 bg-gray-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={brand1} onChange={e => setBrand1(e.target.value)}>
                    <option value="">Select Brand 1</option>
                    {rankedBrands.map(b => <option key={b.brand} value={b.brand}>{b.brand} (Score: {b.score})</option>)}
                  </select>
                  <span className="text-gray-500 font-bold italic text-xl">VS</span>
                  <select className="flex-1 bg-gray-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={brand2} onChange={e => setBrand2(e.target.value)}>
                    <option value="">Select Brand 2</option>
                    {rankedBrands.map(b => <option key={b.brand} value={b.brand}>{b.brand} (Score: {b.score})</option>)}
                  </select>
                </div>
                {brand1 && brand2 && brand1 !== brand2 && (
                  <div className="mt-6 pt-6 border-t border-white/5">
                    {(() => {
                      const b1 = rankedBrands.find(b => b.brand === brand1)!;
                      const b2 = rankedBrands.find(b => b.brand === brand2)!;
                      const diff = b1.score - b2.score;
                      return (
                        <div className="text-center">
                          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium mb-4">
                            Advantage: <span className={diff > 0 ? 'text-primary-400' : diff < 0 ? 'text-purple-400' : 'text-gray-400'}>{Math.abs(diff)} points to {diff > 0 ? b1.brand : diff < 0 ? b2.brand : 'Tie'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
                            <div className="space-y-3 text-right border-r border-white/5 pr-8">
                              <h4 className="text-lg font-bold text-primary-400">{b1.brand}</h4>
                              <div className="text-sm text-gray-400">Rec: <span className="text-white">{b1.breakdown.recommendation}</span></div>
                              <div className="text-sm text-gray-400">Sent: <span className="text-white">{b1.breakdown.sentiment}</span></div>
                              <div className="text-sm text-gray-400">Prom: <span className="text-white">{b1.breakdown.prominence}</span></div>
                              <div className="text-sm text-gray-400">Acc: <span className="text-white">{b1.breakdown.accuracy}</span></div>
                            </div>
                            <div className="space-y-3 text-left pl-8">
                              <h4 className="text-lg font-bold text-purple-400">{b2.brand}</h4>
                              <div className="text-sm text-gray-400"><span className="text-white">{b2.breakdown.recommendation}</span> :Rec</div>
                              <div className="text-sm text-gray-400"><span className="text-white">{b2.breakdown.sentiment}</span> :Sent</div>
                              <div className="text-sm text-gray-400"><span className="text-white">{b2.breakdown.prominence}</span> :Prom</div>
                              <div className="text-sm text-gray-400"><span className="text-white">{b2.breakdown.accuracy}</span> :Acc</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            {/* Top 3 Podium */}
            {top3.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                {top3.map((brand, index) => {
                  const accents = [
                    { border: 'border-yellow-500/20', glow: 'shadow-yellow-500/5', badge: 'bg-yellow-500/15 text-yellow-400', num: 'text-yellow-500/[0.07]' },
                    { border: 'border-gray-400/15', glow: 'shadow-gray-400/5', badge: 'bg-gray-400/15 text-gray-300', num: 'text-gray-400/[0.07]' },
                    { border: 'border-orange-500/15', glow: 'shadow-orange-500/5', badge: 'bg-orange-500/15 text-orange-400', num: 'text-orange-500/[0.07]' },
                  ];
                  const a = accents[index];

                  return (
                    <div key={brand.brand} className={`relative overflow-hidden rounded-xl border ${a.border} bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-all duration-300 shadow-lg ${a.glow}`}>
                      <div className={`absolute -right-3 -top-6 text-[140px] font-black ${a.num} leading-none select-none pointer-events-none`}>{index + 1}</div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-1.5 mb-5">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-400"></div>
                          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.15em]">rAsh Score</span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-7">
                          <span className={`text-4xl font-bold tracking-tight bg-gradient-to-r ${scoreGradient(brand.score)} bg-clip-text text-transparent`}>{brand.score}</span>
                          {brand.scoreChange !== null && brand.scoreChange !== 0 && (
                            <span className={`text-xs font-semibold ${brand.scoreChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {brand.scoreChange > 0 ? '+' : ''}{brand.scoreChange}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <BrandLogo brand={brand.brand} size={28} rank={index} />
                          <h3 className="text-sm font-semibold text-white truncate">{brand.brand}</h3>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* AI Insight Card */}
            <AIInsightCard
              insight={insight}
              loading={insightLoading}
              industryName={industryMeta?.name || selectedIndustry}
            />

            {/* Score Breakdown Chart */}
            {rankedBrands.length >= 3 && (
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-5 mb-8">
                <h3 className="text-[10px] font-medium text-gray-500 mb-5 uppercase tracking-[0.2em]">
                  Score Breakdown — Top 3
                </h3>
                <ScoreBreakdownChart brands={rankedBrands} />
              </div>
            )}

            {/* Timeline Chart */}
            {Object.keys(timelineBrands).length > 0 && (
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-5 mb-8">
                <h3 className="text-[10px] font-medium text-gray-500 mb-4 uppercase tracking-[0.2em]">
                  Score Trend — Top 5
                </h3>
                <TimelineChart
                  data={timelineBrands}
                  brands={rankedBrands.slice(0, 5).map(b => b.brand)}
                  dates={timelineDates}
                />
              </div>
            )}

            {/* Rankings Table */}
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] overflow-hidden">
              <div className="grid grid-cols-12 px-4 sm:px-5 py-3 border-b border-white/[0.04] text-[10px] font-medium text-gray-600 uppercase tracking-[0.15em]">
                <div className="col-span-1">#</div>
                <div className="col-span-7 sm:col-span-5">Company</div>
                <div className="col-span-4 sm:col-span-2 text-right">Score</div>
                <div className="col-span-2 text-right hidden sm:block">Score Δ</div>
                <div className="col-span-2 text-right hidden sm:block">Rank Δ</div>
              </div>

              {rankedBrands.slice(0, 10).map((brand, index) => (
                <div key={brand.brand}
                  className={`grid grid-cols-12 px-4 sm:px-5 py-3.5 items-center border-b border-white/[0.02] transition-colors duration-150 ${index < 3 ? 'bg-white/[0.01]' : 'hover:bg-white/[0.02]'}`}>
                  <div className="col-span-1">
                    <span className={`text-xs font-medium tabular-nums ${index < 3 ? 'text-primary-400' : 'text-gray-600'}`}>{index + 1}</span>
                  </div>
                  <div className="col-span-7 sm:col-span-5 flex items-center gap-2.5 overflow-hidden pr-2">
                    <BrandLogo brand={brand.brand} size={24} rank={index} />
                    <Link href={`/brand/${encodeURIComponent(brand.brand)}`} className={`text-xs sm:text-sm truncate hover:text-primary-400 transition-colors ${index < 3 ? 'font-semibold text-white' : 'font-medium text-gray-300'}`}>
                      {brand.brand}
                    </Link>
                  </div>
                  <div className="col-span-4 sm:col-span-2 text-right">
                    <span className="text-sm font-semibold tabular-nums" style={{ color: scoreColor(brand.score) }}>{brand.score}</span>
                  </div>
                  <div className="col-span-2 text-right hidden sm:block">
                    {brand.scoreChange !== null && brand.scoreChange !== 0 ? (
                      <span className={`text-xs font-semibold tabular-nums ${brand.scoreChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {brand.scoreChange > 0 ? '+' : ''}{brand.scoreChange}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-700">—</span>
                    )}
                  </div>
                  <div className="col-span-2 text-right hidden sm:block">
                    {brand.rankChange !== null && brand.rankChange !== 0 ? (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${brand.rankChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        <svg className={`w-3 h-3 ${brand.rankChange < 0 ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                        </svg>
                        {Math.abs(brand.rankChange)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-700">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-3">
                <span>Industry Avg: <span className="text-gray-400 font-medium">{industryData.industryAverage.score.toFixed(1)}</span></span>
                <span className="text-gray-800">|</span>
                <span>All scores /100</span>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                <span>{selectedModel === 'all' ? 'All Models' : selectedModel} · Powered by NVIDIA + Groq</span>
                <span className="text-[10px] text-gray-500">New data loads daily at 00:00 UTC</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Suspense wrapper required for useSearchParams in Next.js
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-14 h-14 border-[3px] border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>}>
      <DashboardInner />
    </Suspense>
  );
}
