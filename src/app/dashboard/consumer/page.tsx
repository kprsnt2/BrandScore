"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { CONSUMER_INDUSTRIES } from '@/lib/consumer-industry-data';

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
    <div ref={containerRef} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 200 }}>
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
    <div className="space-y-4">
      {top3.map((brand, index) => {
        const barColors = ['#eab308', '#9ca3af', '#f97316'];
        const c = barColors[index];
        return (
          <div key={brand.brand} className="flex items-center gap-3">
            <span className="text-xs text-gray-300 w-36 truncate font-medium">{brand.brand}</span>
            <div className="flex-1 flex gap-[2px] h-3 rounded-full overflow-hidden bg-white/[0.03]">
              <div className="rounded-l-full transition-all duration-500 hover:brightness-125 cursor-help" style={{ width: `${(brand.breakdown.recommendation / 40) * 100}%`, backgroundColor: c, opacity: 1 }} title={`Recommendation: ${Math.round(brand.breakdown.recommendation)}/40`} />
              <div className="transition-all duration-500 hover:brightness-125 cursor-help" style={{ width: `${(brand.breakdown.sentiment / 30) * 100}%`, backgroundColor: c, opacity: 0.65 }} title={`Sentiment: ${Math.round(brand.breakdown.sentiment)}/30`} />
              <div className="transition-all duration-500 hover:brightness-125 cursor-help" style={{ width: `${(brand.breakdown.prominence / 20) * 100}%`, backgroundColor: c, opacity: 0.4 }} title={`Prominence: ${Math.round(brand.breakdown.prominence)}/20`} />
              <div className="rounded-r-full transition-all duration-500 hover:brightness-125 cursor-help" style={{ width: `${(brand.breakdown.accuracy / 10) * 100}%`, backgroundColor: c, opacity: 0.2 }} title={`Accuracy: ${Math.round(brand.breakdown.accuracy)}/10`} />
            </div>
            <span className="text-sm font-bold w-12 text-right tabular-nums" style={{ color: scoreColor(brand.score) }}>{brand.score}</span>
          </div>
        );
      })}
      <div className="flex gap-5 mt-4 text-[10px] text-gray-400 tracking-wide pt-2">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white" style={{opacity:1}}></span> Recommendation</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white" style={{opacity:0.65}}></span> Sentiment</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white" style={{opacity:0.4}}></span> Prominence</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white" style={{opacity:0.25}}></span> Accuracy</span>
      </div>
    </div>
  );
}

// ========== Main Dashboard ==========
export default function ConsumerDashboardPage() {
  const [industryData, setIndustryData] = useState<IndustryResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('consumer-electronics');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [loading, setLoading] = useState(true);

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

  const rankedBrands = industryData?.brands || [];
  const top3 = rankedBrands.slice(0, 3);
  const industryMeta = CONSUMER_INDUSTRIES.find(i => i.id === selectedIndustry);
  const lastUpdated = industryData?.timestamp ? new Date(industryData.timestamp) : null;
  const timelineBrands = timeline?.brands || {};
  const timelineDates = timeline?.dates || [];

  if (loading && !industryData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-[3px] border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-500 text-sm">Loading India AI Index...</p>
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
            India Consumer AI Index
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-[1.1] tracking-tight">
            See who is winning<br />
            <span className="bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">AI Search in India</span>
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            AI visibility rankings for top consumer Indian brands across 15 industries.
          </p>
          {lastUpdated && (
            <p className="text-gray-700 text-xs mt-5">
              Last updated {lastUpdated.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="flex justify-center border-b border-white/[0.04] mb-2 bg-[#0a0a0f]/90 backdrop-blur-2xl relative z-40">
        <div className="flex gap-8">
          <Link href="/dashboard/corporate" className="px-1 py-4 text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors border-b-2 border-transparent">
            Corporate Index
          </Link>
          <Link href="/dashboard/consumer" className="px-1 py-4 text-sm font-medium text-primary-400 border-b-2 border-primary-400">
            Consumer Index
          </Link>
        </div>
      </div>

      {/* Filters */}
      <section className="sticky top-[65px] z-40 bg-[#0a0a0f]/90 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-medium text-white whitespace-nowrap">
              Top <span className="text-primary-400">{industryMeta?.name}</span> brands
            </h2>
            <span className="text-gray-600 text-xs hidden sm:inline">· {rankedBrands.length} ranked</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative">
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 pr-8 text-sm text-gray-300 cursor-pointer hover:bg-white/[0.07] transition-all focus:outline-none focus:ring-1 focus:ring-primary-500/50">
                <option value="all" className="bg-[#1a1a2e] text-gray-200">All Models</option>
                {(industryData?.availableModels || []).map(m => <option key={m} value={m} className="bg-[#1a1a2e] text-gray-200">{m}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <div className="relative">
              <select value={selectedIndustry} onChange={e => { setSelectedIndustry(e.target.value); setSelectedModel('all'); }}
                className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 pr-8 text-sm text-gray-300 cursor-pointer hover:bg-white/[0.07] transition-all focus:outline-none focus:ring-1 focus:ring-primary-500/50">
                {CONSUMER_INDUSTRIES.map(i => <option key={i.id} value={i.id} className="bg-[#1a1a2e] text-gray-200">{i.name}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
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
                          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.15em]">Brand Score</span>
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
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${a.badge}`}>{index + 1}</div>
                          <h3 className="text-sm font-semibold text-white truncate">{brand.brand}</h3>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

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
              <div className="grid grid-cols-12 px-5 py-3 border-b border-white/[0.04] text-[10px] font-medium text-gray-600 uppercase tracking-[0.15em]">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Company</div>
                <div className="col-span-2 text-right">Brand score</div>
                <div className="col-span-2 text-right">Score Δ</div>
                <div className="col-span-2 text-right hidden sm:block">Rank Δ</div>
              </div>

              {rankedBrands.slice(0, 10).map((brand, index) => (
                <div key={brand.brand}
                  className={`grid grid-cols-12 px-5 py-3.5 items-center border-b border-white/[0.02] transition-colors duration-150 ${index < 3 ? 'bg-white/[0.01]' : 'hover:bg-white/[0.02]'}`}>
                  <div className="col-span-1">
                    <span className={`text-xs font-medium tabular-nums ${index < 3 ? 'text-primary-400' : 'text-gray-600'}`}>{index + 1}</span>
                  </div>
                  <div className="col-span-5 flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold
                      ${index === 0 ? 'bg-yellow-500/10 text-yellow-500' :
                        index === 1 ? 'bg-gray-400/10 text-gray-400' :
                        index === 2 ? 'bg-orange-500/10 text-orange-400' :
                        'bg-white/[0.04] text-gray-600'}`}>
                      {brand.brand.charAt(0).toUpperCase()}
                    </div>
                    <span className={`text-sm truncate ${index < 3 ? 'font-semibold text-white' : 'font-medium text-gray-300'}`}>
                      {brand.brand}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold tabular-nums" style={{ color: scoreColor(brand.score) }}>{brand.score}</span>
                  </div>
                  <div className="col-span-2 text-right">
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
                <span>Industry Avg: <span className="text-gray-400 font-medium">{currentIndustry.industryAverage.score.toFixed(1)}</span></span>
                <span className="text-gray-800">|</span>
                <span>All scores /100</span>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                <span>{selectedModel === 'all' ? 'All Models' : selectedModel} · Powered by Gemini, Llama, DeepSeek</span>
                <span className="text-[10px] text-gray-500">New data loads daily at 00:00 UTC</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
