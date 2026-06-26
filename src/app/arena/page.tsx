"use client";

import { useState } from 'react';
import { INDUSTRIES } from '@/lib/industry-data';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Flatten all brands for dropdowns
const ALL_BRANDS = INDUSTRIES.flatMap(i => i.topBrands).sort();

export default function ArenaPage() {
  const [brandA, setBrandA] = useState(ALL_BRANDS[0]);
  const [brandB, setBrandB] = useState(ALL_BRANDS[1]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [results, setResults] = useState<{
    historyA: { score: number; run_date: string }[];
    historyB: { score: number; run_date: string }[];
    debateMarkdown: string;
    generatedBy: string;
  } | null>(null);

  async function handleFight() {
    if (brandA === brandB) {
      setError("Please select two different brands.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch(`/api/arena?brandA=${encodeURIComponent(brandA)}&brandB=${encodeURIComponent(brandB)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch debate');
      }
      
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // Calculate chart max/min dates
  let maxPoints = 0;
  if (results) {
    maxPoints = Math.max(results.historyA.length, results.historyB.length);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            AI vs AI
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Battle Arena</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Pit two brands against each other in a head-to-head AI visibility showdown, judged by autonomous LLM agents.
          </p>
        </header>

        {/* Selection Area */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 sm:p-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="flex-1 w-full relative">
              <label className="block text-sm font-medium text-blue-400 mb-2">Corner A (Blue)</label>
              <select 
                value={brandA}
                onChange={(e) => setBrandA(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                {ALL_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="text-2xl font-black text-white/20 italic mt-6 md:mt-0">VS</div>

            <div className="flex-1 w-full relative">
              <label className="block text-sm font-medium text-red-400 mb-2">Corner B (Red)</label>
              <select 
                value={brandB}
                onChange={(e) => setBrandB(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
              >
                {ALL_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <button 
              onClick={handleFight}
              disabled={loading}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Debate...
                </>
              ) : (
                '⚔️ FIGHT!'
              )}
            </button>
          </div>
          
          {error && (
            <div className="mt-6 text-center text-red-400 bg-red-500/10 py-3 rounded-lg border border-red-500/20">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Results Area */}
        {results && (
          <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Chart Column */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 sm:p-8 flex flex-col">
              <h3 className="text-xl font-bold text-white mb-6">Historical Score Match-up</h3>
              <div className="flex-1 relative h-64 sm:h-80 w-full flex items-end gap-1">
                {Array.from({ length: maxPoints }).map((_, i) => {
                  const ptA = results.historyA[i];
                  const ptB = results.historyB[i];
                  
                  return (
                    <div key={i} className="flex-1 h-full flex flex-col justify-end group relative">
                      <div className="w-full relative h-[80%] flex items-end px-[10%] gap-1">
                        {/* Bar A */}
                        <div 
                          className="w-1/2 bg-blue-500/80 rounded-t-sm transition-all relative"
                          style={{ height: \`\${ptA ? ptA.score : 0}%\` }}
                        >
                          {ptA && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10 transition-opacity">
                              {brandA}: {ptA.score}
                            </div>
                          )}
                        </div>
                        {/* Bar B */}
                        <div 
                          className="w-1/2 bg-red-500/80 rounded-t-sm transition-all relative"
                          style={{ height: \`\${ptB ? ptB.score : 0}%\` }}
                        >
                          {ptB && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10 transition-opacity">
                              {brandB}: {ptB.score}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="h-6 mt-2 border-t border-white/10 w-full flex justify-center pt-2">
                        <span className="text-[10px] text-gray-500 rotate-45 origin-left truncate">
                          {ptA?.run_date || ptB?.run_date || ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Debate Column */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Live AI Debate</h3>
                <span className="text-xs text-gray-500 font-mono">By {results.generatedBy}</span>
              </div>
              <div className="prose prose-invert prose-blue max-w-none prose-headings:font-bold prose-h3:text-lg prose-p:text-gray-300 prose-p:leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {results.debateMarkdown}
                </ReactMarkdown>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
