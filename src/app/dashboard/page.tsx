"use client";

import { useState, useEffect, useMemo } from 'react';
import { INDUSTRIES } from '@/lib/industry-data';

interface BrandResult {
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

interface IndustryResult {
  industry: {
    id: string;
    name: string;
    category: string;
  };
  brandResults: BrandResult[];
  industryAverage: {
    score: number;
  };
}

interface PipelineData {
  results: IndustryResult[];
  summary: {
    totalBrands: number;
    successfulBrands: number;
  };
  timestamp: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('technology');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      try {
        const response = await fetch('/data/latest-results.json');
        if (response.ok) {
          const json = await response.json();
          if (json.results && json.results.length > 0) {
            setData(json);
            setSelectedIndustry(json.results[0]?.industry?.id || 'technology');
          }
        }
      } catch (error) {
        console.log('No pre-computed results available');
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, []);

  const currentIndustry = useMemo(() => {
    if (!data) return null;
    return data.results.find(r => r.industry?.id === selectedIndustry);
  }, [data, selectedIndustry]);

  const rankedBrands = useMemo(() => {
    if (!currentIndustry) return [];
    return currentIndustry.brandResults
      .filter(b => !b.error && b.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [currentIndustry]);

  const top3 = rankedBrands.slice(0, 3);
  const restBrands = rankedBrands.slice(3);

  const industryMeta = INDUSTRIES.find(i => i.id === selectedIndustry);
  const lastUpdated = data?.timestamp ? new Date(data.timestamp) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading India AI Index...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <p className="text-primary-400 font-medium tracking-wide text-sm mb-4 uppercase">
            India AI Index
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            See who is winning<br />
            <span className="gradient-text">AI Search in India</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            Explore the top Indian brands leading AI search visibility, powered by
            multi-model analysis across Gemini, Llama, and DeepSeek.
          </p>

          {lastUpdated && (
            <p className="text-gray-600 text-sm">
              Last updated: {lastUpdated.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </section>

      {/* Industry Tabs */}
      <section className="border-b border-gray-800 sticky top-[65px] z-40 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            {INDUSTRIES.map(industry => (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-shrink-0
                  ${selectedIndustry === industry.id
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white'
                  }`}
              >
                {industry.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {!data || !currentIndustry ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📊</p>
            <h2 className="text-2xl font-bold text-white mb-2">No data available yet</h2>
            <p className="text-gray-400">The pipeline hasn&apos;t run yet. Data will appear after the first automated analysis.</p>
          </div>
        ) : (
          <>
            {/* Industry Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Top <span className="text-primary-400">{industryMeta?.name || selectedIndustry}</span> brands
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {rankedBrands.length} brands ranked by AI visibility score
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-medium">
                  🤖 Multi-Model
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-medium">
                  🇮🇳 India
                </span>
              </div>
            </div>

            {/* Top 3 Podium */}
            {top3.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                {top3.map((brand, index) => (
                  <div
                    key={brand.brand}
                    className="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 p-6 group hover:border-gray-700 transition-all duration-300"
                  >
                    {/* Large rank number watermark */}
                    <div className="absolute -right-4 -top-4 text-[120px] font-black text-gray-800/30 leading-none select-none pointer-events-none">
                      {index + 1}
                    </div>

                    <div className="relative z-10">
                      {/* Visibility Score */}
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-2 h-2 rounded-full bg-primary-400"></div>
                        <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Visibility Score</span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-8">
                        <span className="text-3xl font-bold text-white">{brand.score}</span>
                        <span className="text-gray-500 text-lg">/100</span>
                      </div>

                      {/* Brand name */}
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                          ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                            index === 1 ? 'bg-gray-400/20 text-gray-300' :
                            'bg-orange-500/20 text-orange-400'}`}>
                          {index + 1}
                        </div>
                        <h3 className="text-lg font-semibold text-white truncate">{brand.brand}</h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Score Breakdown Bar for Top 3 */}
            {top3.length >= 3 && (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 mb-10">
                <h3 className="text-sm font-medium text-gray-400 mb-6 uppercase tracking-wide">Score Breakdown — Top 3</h3>
                <div className="space-y-5">
                  {top3.map((brand, index) => {
                    const colors = ['#facc15', '#94a3b8', '#f97316'];
                    return (
                      <div key={brand.brand} className="flex items-center gap-4">
                        <span className="text-sm text-gray-400 w-40 truncate">{brand.brand}</span>
                        <div className="flex-1 flex gap-0.5 h-3 rounded-full overflow-hidden bg-gray-800">
                          <div
                            className="rounded-l-full transition-all duration-700"
                            style={{ width: `${(brand.breakdown.recommendation / 40) * 100}%`, backgroundColor: colors[index] }}
                            title={`Recommendation: ${brand.breakdown.recommendation}/40`}
                          />
                          <div
                            className="transition-all duration-700"
                            style={{ width: `${(brand.breakdown.sentiment / 30) * 100}%`, backgroundColor: colors[index], opacity: 0.7 }}
                            title={`Sentiment: ${brand.breakdown.sentiment}/30`}
                          />
                          <div
                            className="transition-all duration-700"
                            style={{ width: `${(brand.breakdown.prominence / 20) * 100}%`, backgroundColor: colors[index], opacity: 0.5 }}
                            title={`Prominence: ${brand.breakdown.prominence}/20`}
                          />
                          <div
                            className="rounded-r-full transition-all duration-700"
                            style={{ width: `${(brand.breakdown.accuracy / 10) * 100}%`, backgroundColor: colors[index], opacity: 0.3 }}
                            title={`Accuracy: ${brand.breakdown.accuracy}/10`}
                          />
                        </div>
                        <span className="text-sm font-semibold text-white w-14 text-right">{brand.score}/100</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-6 mt-4 text-xs text-gray-500">
                  <span>■ Recommendation</span>
                  <span style={{opacity:0.7}}>■ Sentiment</span>
                  <span style={{opacity:0.5}}>■ Prominence</span>
                  <span style={{opacity:0.3}}>■ Accuracy</span>
                </div>
              </div>
            )}

            {/* Full Rankings Table */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 px-6 py-3 border-b border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Company</div>
                <div className="col-span-2 text-right">Score</div>
                <div className="col-span-2 text-right hidden sm:block">Recommend</div>
                <div className="col-span-2 text-right hidden sm:block">Sentiment</div>
              </div>

              {/* Table rows */}
              {rankedBrands.map((brand, index) => (
                <div
                  key={brand.brand}
                  className={`grid grid-cols-12 px-6 py-4 items-center border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors group
                    ${index < 3 ? 'bg-gray-800/10' : ''}`}
                >
                  <div className="col-span-1">
                    <span className={`text-sm font-medium ${index < 3 ? 'text-primary-400' : 'text-gray-500'}`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="col-span-5 flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                      ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        index === 1 ? 'bg-gray-400/20 text-gray-300' :
                        index === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-800 text-gray-500'}`}
                    >
                      {brand.brand.charAt(0)}
                    </div>
                    <span className="font-medium text-white text-sm truncate">{brand.brand}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="font-semibold text-white text-sm">{brand.score}</span>
                    <span className="text-gray-500 text-xs">/100</span>
                  </div>
                  <div className="col-span-2 text-right hidden sm:block">
                    <span className="text-sm text-gray-400">{brand.breakdown.recommendation}/40</span>
                  </div>
                  <div className="col-span-2 text-right hidden sm:block">
                    <span className="text-sm text-gray-400">{brand.breakdown.sentiment}/30</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Industry Average Footer */}
            <div className="mt-6 flex items-center justify-between px-2">
              <p className="text-sm text-gray-500">
                Industry Average: <span className="text-white font-semibold">{currentIndustry.industryAverage.score}/100</span>
              </p>
              <p className="text-xs text-gray-600">
                Powered by Gemini, Llama, DeepSeek
              </p>
            </div>
          </>
        )}
      </div>

      {/* Scrollbar hide style */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
