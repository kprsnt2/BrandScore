"use client";

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function RashEngineButton({ brand, industry }: { brand: string, industry: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [generatedBy, setGeneratedBy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticStep, setDiagnosticStep] = useState(0);

  const diagnosticSteps = [
    "Compiling current LLM prompt visibility metrics...",
    "Scanning competitive brand share-of-voice indices...",
    "Analyzing sentiment alignment anomalies...",
    "Synthesizing customized LLMO action steps..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setDiagnosticStep(0);
      interval = setInterval(() => {
        setDiagnosticStep(prev => (prev < 3 ? prev + 1 : prev));
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [loading]);

  async function handleGenerate() {
    setIsOpen(true);
    if (plan) return; // Already generated

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rs?brand=${encodeURIComponent(brand)}&industry=${encodeURIComponent(industry)}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to generate plan');
      
      setPlan(data.plan);
      setGeneratedBy(data.generatedBy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button 
        onClick={handleGenerate}
        className="group relative mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-pink-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/30 transition-all duration-300 active:scale-95 flex items-center gap-2.5 w-max overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-purple-200 group-hover:animate-bounce">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
        <span>LAUNCH rAsh ENGINE</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#08080e]/95 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-white/[0.08] flex justify-between items-center bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">rAsh LLM Optimization Engine</h3>
                  <p className="text-[10px] text-gray-500 font-mono">STRATEGY FORMULATION FOR {brand.toUpperCase()}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-gradient-to-b from-[#08080e] to-[#050508]">
              {loading && (
                <div className="flex flex-col py-12 px-4 space-y-6">
                  {/* Glowing spinner */}
                  <div className="flex justify-center">
                    <div className="relative w-14 h-14">
                      <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
                      <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin" />
                    </div>
                  </div>
                  
                  {/* Diagnostics status messages */}
                  <div className="max-w-md mx-auto w-full bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 space-y-3 font-mono text-xs shadow-inner">
                    {diagnosticSteps.map((step, idx) => {
                      const isPending = idx > diagnosticStep;
                      const isActive = idx === diagnosticStep;
                      
                      return (
                        <div key={idx} className="flex items-center gap-3 transition-opacity duration-300">
                          {isPending ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                          ) : isActive ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                          ) : (
                            <span className="text-green-500 font-bold">✓</span>
                          )}
                          <span className={`${
                            isPending ? 'text-gray-600' : isActive ? 'text-purple-400 font-bold' : 'text-gray-400'
                          }`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-mono">
                  ⚠️ DIAGNOSTIC ERROR: {error}
                </div>
              )}

              {plan && (
                <div className="prose prose-sm prose-invert prose-purple max-w-none space-y-6 font-light leading-relaxed prose-headings:font-bold prose-h3:text-purple-400 prose-p:text-gray-300 prose-li:text-gray-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {plan}
                  </ReactMarkdown>
                  
                  {generatedBy && (
                    <div className="mt-8 pt-4 border-t border-white/[0.05] text-[9px] text-gray-500 font-mono text-right uppercase tracking-wider">
                      Generated by {generatedBy}
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
