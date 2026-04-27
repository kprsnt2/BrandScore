"use client";

import { useState, useEffect, useMemo } from 'react';
import { INDUSTRIES } from '@/lib/industry-data';

interface BrandScore {
  brand: string;
  score: number;
  breakdown: {
    recommendation: number;
    sentiment: number;
    prominence: number;
    accuracy: number;
  };
  error?: string;
}

interface ModelData {
  model: string;
  brandScores: BrandScore[];
}

interface IndustryResult {
  industry: { id: string; name: string; category: string };
  brandResults: BrandScore[];
  modelData?: ModelData[];
  industryAverage: { score: number };
}

interface PipelineData {
  results: IndustryResult[];
  summary: { totalBrands: number; successfulBrands: number };
  timestamp: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('technology');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      try {
        const response = await fetch('/data/latest-results.json');
        if (response.ok) {
          const json = await response.json();
          if (json.results?.length > 0) {
            setData(json);
            setSelectedIndustry(json.results[0]?.industry?.id || 'technology');
          }
        }
      } catch { console.log('No pre-computed results available'); }
      finally { setLoading(false); }
    }
    loadResults();
  }, []);

  const currentIndustry = useMemo(() => {
    if (!data) return null;
    return data.results.find(r => r.industry?.id === selectedIndustry);
  }, [data, selectedIndustry]);

  // Available models from data
  const availableModels = useMemo(() => {
    if (!currentIndustry?.modelData) return [];
    return currentIndustry.modelData.map(m => m.model);
  }, [currentIndustry]);

  // Get brands based on selected model
  const rankedBrands = useMemo(() => {
    if (!currentIndustry) return [];

    if (selectedModel === 'all' || !currentIndustry.modelData) {
      return currentIndustry.brandResults
        .filter(b => !b.error && b.score > 0)
        .sort((a, b) => b.score - a.score);
    }

    const modelResult = currentIndustry.modelData.find(m => m.model === selectedModel);
    if (!modelResult) return [];

    return modelResult.brandScores
      .filter(b => b.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [currentIndustry, selectedModel]);

  const top3 = rankedBrands.slice(0, 3);
  const industryMeta = INDUSTRIES.find(i => i.id === selectedIndustry);
  const lastUpdated = data?.timestamp ? new Date(data.timestamp) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-[3px] border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-500 text-sm tracking-wide">Loading India AI Index...</p>
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
            India AI Index
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-[1.1] tracking-tight">
            See who is winning<br />
            <span className="bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">AI Search in India</span>
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            AI visibility rankings for 225 top Indian brands across 15 industries.
          </p>
          {lastUpdated && (
            <p className="text-gray-700 text-xs mt-5 tracking-wide">
              Last updated {lastUpdated.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </section>

      {/* Filters Bar */}
      <section className="sticky top-[65px] z-40 bg-[#0a0a0f]/90 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-medium text-white whitespace-nowrap">
              Top <span className="text-primary-400">{industryMeta?.name}</span> brands
            </h2>
            <span className="text-gray-600 text-xs hidden sm:inline">
              · {rankedBrands.length} ranked
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Model Dropdown */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 pr-8 text-sm text-gray-300 cursor-pointer hover:bg-white/[0.07] hover:border-white/[0.12] transition-all focus:outline-none focus:ring-1 focus:ring-primary-500/50"
              >
                <option value="all">All Models</option>
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {/* Industry Dropdown */}
            <div className="relative">
              <select
                value={selectedIndustry}
                onChange={e => { setSelectedIndustry(e.target.value); setSelectedModel('all'); }}
                className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 pr-8 text-sm text-gray-300 cursor-pointer hover:bg-white/[0.07] hover:border-white/[0.12] transition-all focus:outline-none focus:ring-1 focus:ring-primary-500/50"
              >
                {INDUSTRIES.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!data || !currentIndustry || rankedBrands.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">📊</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No data available</h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">The pipeline hasn&apos;t run yet. Data will appear after the first automated analysis.</p>
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
                    <div
                      key={brand.brand}
                      className={`relative overflow-hidden rounded-xl border ${a.border} bg-white/[0.02] p-5 group hover:bg-white/[0.04] transition-all duration-300 shadow-lg ${a.glow}`}
                    >
                      {/* Rank watermark */}
                      <div className={`absolute -right-3 -top-6 text-[140px] font-black ${a.num} leading-none select-none pointer-events-none`}>
                        {index + 1}
                      </div>

                      <div className="relative z-10">
                        <div className="flex items-center gap-1.5 mb-5">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-400"></div>
                          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.15em]">Visibility Score</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mb-7">
                          <span className="text-4xl font-bold text-white tracking-tight">{brand.score}</span>
                          <span className="text-gray-600 text-base">/100</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${a.badge}`}>
                            {index + 1}
                          </div>
                          <h3 className="text-sm font-semibold text-white truncate">{brand.brand}</h3>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Score Breakdown */}
            {top3.length >= 3 && (
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-5 mb-8">
                <h3 className="text-[10px] font-medium text-gray-500 mb-5 uppercase tracking-[0.2em]">Score Breakdown — Top 3</h3>
                <div className="space-y-4">
                  {top3.map((brand, index) => {
                    const barColors = ['#eab308', '#94a3b8', '#f97316'];
                    const c = barColors[index];
                    return (
                      <div key={brand.brand} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-32 truncate font-medium">{brand.brand}</span>
                        <div className="flex-1 flex gap-[2px] h-2.5 rounded-full overflow-hidden bg-white/[0.03]">
                          <div className="rounded-l-full" style={{ width: `${(brand.breakdown.recommendation / 40) * 100}%`, backgroundColor: c, opacity: 1 }} />
                          <div style={{ width: `${(brand.breakdown.sentiment / 30) * 100}%`, backgroundColor: c, opacity: 0.65 }} />
                          <div style={{ width: `${(brand.breakdown.prominence / 20) * 100}%`, backgroundColor: c, opacity: 0.4 }} />
                          <div className="rounded-r-full" style={{ width: `${(brand.breakdown.accuracy / 10) * 100}%`, backgroundColor: c, opacity: 0.2 }} />
                        </div>
                        <span className="text-xs font-semibold text-white w-12 text-right tabular-nums">{brand.score}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-5 mt-4 text-[10px] text-gray-600 tracking-wide">
                  <span>● Recommendation</span>
                  <span style={{opacity:0.65}}>● Sentiment</span>
                  <span style={{opacity:0.4}}>● Prominence</span>
                  <span style={{opacity:0.2}}>● Accuracy</span>
                </div>
              </div>
            )}

            {/* Rankings Table */}
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 border-b border-white/[0.04] text-[10px] font-medium text-gray-600 uppercase tracking-[0.15em]">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Company</div>
                <div className="col-span-2 text-right">Score</div>
                <div className="col-span-2 text-right hidden sm:block">Recommend</div>
                <div className="col-span-2 text-right hidden sm:block">Sentiment</div>
              </div>

              {rankedBrands.map((brand, index) => (
                <div
                  key={brand.brand}
                  className={`grid grid-cols-12 px-5 py-3.5 items-center border-b border-white/[0.02] transition-colors duration-150
                    ${index < 3 ? 'bg-white/[0.01]' : 'hover:bg-white/[0.02]'}`}
                >
                  <div className="col-span-1">
                    <span className={`text-xs font-medium tabular-nums ${index < 3 ? 'text-primary-400' : 'text-gray-600'}`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="col-span-5 flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold
                      ${index === 0 ? 'bg-yellow-500/10 text-yellow-500' :
                        index === 1 ? 'bg-gray-400/10 text-gray-400' :
                        index === 2 ? 'bg-orange-500/10 text-orange-400' :
                        'bg-white/[0.04] text-gray-600'}`}
                    >
                      {brand.brand.charAt(0).toUpperCase()}
                    </div>
                    <span className={`text-sm truncate ${index < 3 ? 'font-semibold text-white' : 'font-medium text-gray-300'}`}>
                      {brand.brand}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-white tabular-nums">{brand.score}</span>
                    <span className="text-gray-600 text-xs">/100</span>
                  </div>
                  <div className="col-span-2 text-right hidden sm:block">
                    <span className="text-xs text-gray-500 tabular-nums">{brand.breakdown.recommendation}/40</span>
                  </div>
                  <div className="col-span-2 text-right hidden sm:block">
                    <span className="text-xs text-gray-500 tabular-nums">{brand.breakdown.sentiment}/30</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer stats */}
            <div className="mt-5 flex items-center justify-between px-1 text-xs text-gray-600">
              <span>
                Industry Avg: <span className="text-gray-400 font-medium">{currentIndustry.industryAverage.score}/100</span>
              </span>
              <span className="flex items-center gap-1.5">
                {selectedModel === 'all' ? 'All Models' : selectedModel}
                <span className="mx-1 text-gray-700">·</span>
                Powered by Gemini, Llama, DeepSeek
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
