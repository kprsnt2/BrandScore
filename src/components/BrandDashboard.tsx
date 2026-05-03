"use client";
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface BrandResult {
  brand: string; score: number;
  breakdown: { recommendation: number; sentiment: number; prominence: number; accuracy: number; };
  error?: string;
}
interface IndustryResult {
  industry: { id: string; name: string; category: string; description: string; topBrands: string[]; };
  brandResults: BrandResult[];
  industryAverage: { score: number; recommendation: number; sentiment: number; prominence: number; accuracy: number; };
  topPerformers: any[]; bottomPerformers: any[];
  totalResponseTime: number; timestamp: string; error?: string;
}
interface Props {
  results?: IndustryResult[]; isLoading?: boolean; lastUpdated?: string | null;
  onRunIndustry?: (id: string) => void; onRunAllIndustries?: () => void;
}

const INDUSTRIES = [
  { id: 'technology', name: 'Technology & IT', icon: '💻' },
  { id: 'automotive', name: 'Automotive', icon: '🚗' },
  { id: 'ecommerce', name: 'Retail & E-Commerce', icon: '🛒' },
  { id: 'fashion', name: 'Fashion & Apparel', icon: '👗' },
  { id: 'food-beverage', name: 'Food & Beverage', icon: '🍛' },
  { id: 'healthcare', name: 'Healthcare & Pharma', icon: '🏥' },
  { id: 'finance', name: 'Finance & Banking', icon: '💰' },
  { id: 'telecom', name: 'Telecom', icon: '📱' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'energy', name: 'Energy', icon: '⚡' },
  { id: 'fmcg', name: 'FMCG', icon: '📦' },
  { id: 'realestate', name: 'Real Estate', icon: '🏗️' },
  { id: 'edtech', name: 'EdTech', icon: '📚' },
  { id: 'logistics', name: 'Logistics', icon: '🚚' },
  { id: 'consumer-electronics', name: 'Consumer Electronics', icon: '📺' },
  { id: 'mobile-phones', name: 'Mobile Phones', icon: '📱' },
  { id: 'home-appliances', name: 'Home Appliances', icon: '🏠' },
  { id: 'two-wheelers', name: 'Two Wheelers', icon: '🏍️' },
];

export default function BrandDashboard({ results = [], isLoading = false, lastUpdated, onRunIndustry, onRunAllIndustries }: Props) {
  const [activeIndustry, setActiveIndustry] = useState<string>(results.length > 0 ? results[0].industry.id : 'technology');

  // Get the currently selected industry result
  const currentResult = useMemo(() => {
    return results.find(r => r.industry.id === activeIndustry);
  }, [results, activeIndustry]);

  // Get sorted brands for current industry
  const sortedBrands = useMemo(() => {
    if (!currentResult || currentResult.error) return [];
    return currentResult.brandResults
      .filter(b => !b.error)
      .sort((a, b) => b.score - a.score);
  }, [currentResult]);

  const top3 = sortedBrands.slice(0, 3);
  const restBrands = sortedBrands.slice(3);

  // Simple sparkline SVG for a brand
  const Sparkline = ({ color }: { color: string }) => {
    // Generate a plausible trend line
    const points = Array.from({ length: 7 }, (_, i) => {
      const base = 40 + Math.random() * 20;
      return `${i * 20},${60 - base * 0.6}`;
    }).join(' ');
    return (
      <svg width="140" height="40" viewBox="0 0 140 40" className="opacity-60">
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      </svg>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Sticky Industry Pill Bar */}
      <div className="sticky top-[65px] z-40 border-b border-gray-800/60" style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {INDUSTRIES.map(ind => {
              const hasData = results.some(r => r.industry.id === ind.id && !r.error);
              return (
                <button key={ind.id} onClick={() => setActiveIndustry(ind.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeIndustry === ind.id
                      ? 'bg-white text-black'
                      : hasData
                        ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                        : 'bg-gray-900 text-gray-600 border border-gray-800'
                  }`}>
                  {ind.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">India Brand AI Index</h1>
            <div className="flex gap-2">
              <button onClick={() => activeIndustry && onRunIndustry?.(activeIndustry)} disabled={isLoading}
                className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-700 disabled:opacity-40 transition-all">
                {isLoading ? 'Analyzing...' : 'Run This Industry'}
              </button>
              <button onClick={onRunAllIndustries} disabled={isLoading}
                className="px-4 py-2 text-sm bg-white text-black rounded-lg font-medium hover:bg-gray-200 disabled:opacity-40 transition-all">
                {isLoading ? 'Running...' : 'Run All'}
              </button>
            </div>
          </div>
          <p className="text-gray-500 text-sm">
            See which Indian brands lead in AI search visibility, powered by multi-model analysis.
            {lastUpdated && <span className="ml-2 text-gray-600">Updated: {new Date(lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Analyzing brands...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && results.length === 0 && (
          <div className="text-center py-24">
            <div className="text-6xl mb-6">🇮🇳</div>
            <h2 className="text-2xl font-bold text-white mb-3">India Brand Intelligence Index</h2>
            <p className="text-gray-400 mb-2 max-w-md mx-auto">AI visibility rankings for 285 top Indian brands across 19 industries.</p>
            <p className="text-gray-600 text-sm mb-8">Powered by Gemini, Llama, DeepSeek</p>
            <button onClick={onRunAllIndustries}
              className="px-8 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all">
              Launch Full Analysis
            </button>
          </div>
        )}

        {/* No data for this industry */}
        {!isLoading && results.length > 0 && !currentResult && (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">No data for this industry yet.</p>
            <button onClick={() => onRunIndustry?.(activeIndustry)}
              className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-all text-sm">
              Analyze {INDUSTRIES.find(i => i.id === activeIndustry)?.name}
            </button>
          </div>
        )}

        {/* Main Content: Top 3 Podium + Chart + Leaderboard */}
        {!isLoading && currentResult && !currentResult.error && sortedBrands.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={activeIndustry}>

            {/* Top 3 Podium Cards */}
            <div className="grid grid-cols-3 gap-px mb-px" style={{ background: '#1a1a1a', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
              {top3.map((brand, i) => {
                const colors = ['#22c55e', '#3b82f6', '#ef4444'];
                return (
                  <div key={brand.brand} className="relative p-6 overflow-hidden" style={{ background: '#111' }}>
                    {/* Large rank number in background */}
                    <div className="absolute right-2 bottom-0 text-[120px] font-black leading-none select-none" style={{ color: 'rgba(255,255,255,0.04)' }}>
                      {i + 1}
                    </div>
                    <div className="relative z-10">
                      {/* Brand icon placeholder */}
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold mb-3" style={{ background: colors[i] + '20', color: colors[i] }}>
                        {brand.brand.charAt(0)}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3 truncate">{brand.brand}</h3>
                      <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-bold text-white">{brand.score}<span className="text-lg text-gray-500">%</span></span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">AI Visibility Score</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trend Chart Area */}
            <div className="mb-8 p-6" style={{ background: '#111', borderRadius: '0 0 12px 12px' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Score Breakdown — Top 3</h3>
              </div>
              {/* Simple bar chart for breakdown comparison */}
              <div className="space-y-4">
                {['Recommendation', 'Sentiment', 'Prominence', 'Accuracy'].map((metric, mi) => {
                  const key = metric.toLowerCase() as keyof BrandResult['breakdown'];
                  const maxVals = [40, 30, 20, 10];
                  return (
                    <div key={metric}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500">{metric}</span>
                        <span className="text-xs text-gray-600">/{maxVals[mi]}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {top3.map((brand, bi) => {
                          const colors = ['#22c55e', '#3b82f6', '#ef4444'];
                          const val = brand.breakdown[key];
                          const pct = (val / maxVals[mi]) * 100;
                          return (
                            <div key={brand.brand} className="flex-1">
                              <div className="h-6 rounded" style={{ background: '#1a1a1a' }}>
                                <motion.div className="h-6 rounded flex items-center justify-end pr-2"
                                  style={{ background: colors[bi], width: `${pct}%` }}
                                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: mi * 0.1 }}>
                                  <span className="text-[10px] font-bold text-white">{val}</span>
                                </motion.div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex gap-4 mt-4">
                {top3.map((brand, i) => {
                  const colors = ['#22c55e', '#3b82f6', '#ef4444'];
                  return (
                    <div key={brand.brand} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i] }} />
                      <span className="text-xs text-gray-400">{brand.brand}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#111' }}>
              {/* Table Header */}
              <div className="flex items-center px-6 py-4 border-b border-gray-800/50">
                <div className="w-12" />
                <div className="flex-1 text-sm text-gray-500 font-medium">Company</div>
                <div className="w-32 text-right text-sm text-gray-500 font-medium">Visibility Score</div>
              </div>

              {/* All brands as rows */}
              {sortedBrands.map((brand, i) => (
                <motion.div key={brand.brand}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center px-6 py-4 border-b border-gray-800/30 hover:bg-white/[0.02] transition-colors group">
                  {/* Rank */}
                  <div className="w-12 text-gray-500 text-sm font-medium">{i + 1}</div>
                  {/* Brand */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        background: i < 3 ? ['#22c55e20', '#3b82f620', '#ef444420'][i] : '#1a1a1a',
                        color: i < 3 ? ['#22c55e', '#3b82f6', '#ef4444'][i] : '#666'
                      }}>
                      {brand.brand.charAt(0)}
                    </div>
                    <span className="text-white font-medium group-hover:text-gray-200">{brand.brand}</span>
                  </div>
                  {/* Score */}
                  <div className="w-32 text-right">
                    <span className="text-white font-semibold text-lg">{brand.score}<span className="text-gray-500 text-sm">%</span></span>
                  </div>
                </motion.div>
              ))}

              {/* CTA row */}
              <div className="flex items-center px-6 py-4 border-t border-gray-800/50">
                <div className="w-12 text-gray-700 text-sm">?</div>
                <div className="flex-1 text-gray-600 text-sm">Your brand</div>
                <a href="/" className="text-gray-500 text-sm hover:text-white transition-colors flex items-center gap-1">
                  Check your AI Visibility <span className="text-xs">↗</span>
                </a>
              </div>
            </div>

            {/* Industry Stats Footer */}
            <div className="mt-6 grid grid-cols-4 gap-px rounded-xl overflow-hidden" style={{ background: '#1a1a1a' }}>
              {[
                { label: 'Industry Score', value: currentResult.industryAverage.score },
                { label: 'Brands Analyzed', value: sortedBrands.length },
                { label: 'Top Score', value: sortedBrands[0]?.score || 0 },
                { label: 'Analysis Time', value: `${Math.round(currentResult.totalResponseTime / 1000)}s` },
              ].map(stat => (
                <div key={stat.label} className="p-4 text-center" style={{ background: '#111' }}>
                  <div className="text-xl font-bold text-white">{stat.value}{typeof stat.value === 'number' ? '%' : ''}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Hide scrollbar for pill bar */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
