import { Metadata } from 'next';
import { getBrandHistory } from '@/lib/db';
import { INDUSTRIES } from '@/lib/industry-data';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Props {
  params: {
    brand: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const decodedBrand = decodeURIComponent(params.brand);
  const formattedBrand = decodedBrand.charAt(0).toUpperCase() + decodedBrand.slice(1);

  return {
    title: `${formattedBrand} AI Visibility Score | India rAsh Score Index`,
    description: `Deep dive into the AI search visibility score, sentiment, and recommendation trends for ${formattedBrand}.`,
  };
}

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

export const revalidate = 3600;

export default async function BrandPage({ params }: Props) {
  const decodedBrand = decodeURIComponent(params.brand);
  const data = await getBrandHistory(decodedBrand);

  if (!data.latestBreakdown) {
    notFound();
  }

  const { history, latestBreakdown, industryIds } = data;
  const industries = industryIds.map(id => INDUSTRIES.find(i => i.id === id)).filter(Boolean);
  
  // Format history for chart
  const dates = Array.from(new Set(history.map(h => h.date))).sort();
  const W = 900, H = 260;
  const PAD = { top: 20, right: 20, bottom: 35, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  
  const allScores = history.map(h => h.score);
  const minScore = Math.max(0, Math.min(...allScores) - 5);
  const maxScore = Math.min(100, Math.max(...allScores) + 5);
  const scoreRange = maxScore - minScore || 1;

  const xScale = (i: number) => PAD.left + (dates.length === 1 ? chartW / 2 : (i / (dates.length - 1)) * chartW);
  const yScale = (v: number) => PAD.top + chartH - ((v - minScore) / scoreRange) * chartH;

  const yTicks: number[] = [];
  const step = scoreRange <= 20 ? 5 : scoreRange <= 50 ? 10 : 20;
  for (let v = Math.ceil(minScore / step) * step; v <= maxScore; v += step) yTicks.push(v);

  const points = dates.map((d, di) => {
    const entry = history.find(e => e.date === d);
    return entry ? { x: xScale(di), y: yScale(entry.score), score: entry.score, date: d } : null;
  }).filter(Boolean) as { x: number; y: number; score: number; date: string }[];
  
  const pathD = points.length > 0 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-8 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 sm:p-12 mb-8">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                {industries.map(ind => ind && (
                  <span key={ind.id} className="px-3 py-1 text-[10px] font-semibold tracking-widest uppercase bg-white/[0.05] text-gray-300 rounded-full border border-white/[0.05]">
                    {ind.name}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl sm:text-6xl font-bold text-white mb-2 tracking-tight">
                {latestBreakdown.brand}
              </h1>
              <p className="text-gray-400">AI Visibility Deep Dive</p>
            </div>
            
            <div className="flex flex-col items-start md:items-end">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.2em] mb-2">Overall Score</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-6xl sm:text-7xl font-black bg-gradient-to-r ${scoreGradient(latestBreakdown.score)} bg-clip-text text-transparent leading-none`}>
                  {latestBreakdown.score}
                </span>
                <span className="text-gray-500 text-xl font-light">/100</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Breakdown Stats */}
          <div className="md:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
              Score Breakdown
            </h3>
            
            {[
              { label: 'Recommendation', value: latestBreakdown.recommendation, max: 40, color: '#22d3ee' },
              { label: 'Sentiment', value: latestBreakdown.sentiment, max: 30, color: '#a78bfa' },
              { label: 'Prominence', value: latestBreakdown.prominence, max: 20, color: '#f472b6' },
              { label: 'Accuracy', value: latestBreakdown.accuracy, max: 10, color: '#34d399' },
            ].map((metric) => (
              <div key={metric.label} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">{metric.label}</span>
                  <span className="text-lg font-bold text-white tabular-nums">{metric.value}<span className="text-gray-600 text-sm font-normal">/{metric.max}</span></span>
                </div>
                <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${(metric.value / metric.max) * 100}%`, backgroundColor: metric.color }} 
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Chart */}
          <div className="md:col-span-2 bg-white/[0.015] border border-white/[0.04] rounded-xl p-6 relative">
            <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              Historical Trend
            </h3>
            
            {points.length > 0 ? (
              <div className="w-full overflow-x-auto pb-4">
                <div className="min-w-[600px]">
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 200 }} aria-label="Score Trend">
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

                    {/* Line */}
                    <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Gradient definition */}
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#a78bfa" />
                      </linearGradient>
                    </defs>

                    {/* Dots */}
                    {points.map((p, pi) => (
                      <g key={pi}>
                        <circle cx={p.x} cy={p.y} r="5" fill="#a78bfa" stroke="#0a0a0f" strokeWidth="2" />
                        <text x={p.x} y={p.y - 12} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{p.score}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500">
                Not enough historical data yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
