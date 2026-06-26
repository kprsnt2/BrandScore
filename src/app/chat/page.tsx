"use client";

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  data?: string;
  generatedBy?: string;
}

const SUGGESTIONS = [
  "Which brand has the highest score in Automotive?",
  "What is the average sentiment across all brands?",
  "List the pipeline runs and their dates",
  "Which brands have a recommendation rate > 80%?"
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to **Ask the Data**! I'm your analytical assistant. I translate natural language into SQL queries, fetch records in real time from our read-only SQLite engine, and present the findings. Ask me anything about brands, sentiments, scores, or trends."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text: string) {
    if (!text.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch answer');
      }

      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: data.answer,
          sql: data.sql,
          data: data.data,
          generatedBy: data.generatedBy
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ **Error:** ${err instanceof Error ? err.message : 'Something went wrong.'}` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    handleSend(userMsg);
  }

  function copyToClipboard(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div className="relative min-h-screen bg-[#07070c] flex flex-col pt-24 pb-36">
      {/* Background glow effects */}
      <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[10%] w-[450px] h-[450px] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none" />

      {/* Floating Status Bar */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 mb-6 relative z-10">
        <div className="bg-white/[0.01] backdrop-blur-xl border border-white/[0.06] rounded-2xl px-6 py-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">Ask the Data</h1>
              <p className="text-[10px] text-gray-500 font-mono">SECURE READ-ONLY SQL CONSOLE</p>
            </div>
          </div>
          <div className="text-[10px] text-gray-500 font-mono bg-white/[0.03] border border-white/5 rounded px-2.5 py-1">
            DATABASE: BRAND-INTELLIGENCE.DB
          </div>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-grow overflow-y-auto px-4 sm:px-6 relative z-10 mb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div 
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-5 shadow-lg relative ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none' 
                    : 'bg-[#0f0f18]/80 backdrop-blur-md border border-white/[0.06] text-gray-200 rounded-tl-none'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono mb-3 border-b border-white/[0.04] pb-2">
                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-purple-400">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      rAsh AI Analyst
                    </span>
                    {msg.generatedBy && <span>Engine: {msg.generatedBy}</span>}
                  </div>
                )}
                
                <div className={`prose prose-sm max-w-none font-light leading-relaxed ${
                  msg.role === 'user' 
                    ? 'prose-invert text-white prose-p:leading-relaxed' 
                    : 'prose-invert prose-p:text-gray-300 prose-p:leading-relaxed prose-strong:text-purple-300 prose-strong:font-bold'
                }`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* SQL execution drawer */}
                {msg.sql && (
                  <div className="mt-4 pt-4 border-t border-white/[0.05]">
                    <details className="group/details">
                      <summary className="cursor-pointer text-[10px] font-bold font-mono text-gray-500 hover:text-gray-400 select-none outline-none flex items-center gap-1">
                        <span className="transition-transform group-open/details:rotate-90">▶</span>
                        INSPECT SQL EXECUTION
                      </summary>
                      
                      <div className="mt-3 bg-[#08080d] border border-white/[0.05] rounded-xl overflow-hidden shadow-inner">
                        {/* Editor Header */}
                        <div className="px-4 py-2 bg-[#0d0d15] border-b border-white/[0.05] flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                            <span className="text-[9px] font-mono text-gray-500 ml-2">query.sql</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(msg.sql || '', i)}
                            className="text-[9px] font-mono text-gray-400 hover:text-white px-2 py-0.5 bg-white/[0.02] border border-white/10 rounded transition-colors"
                          >
                            {copiedIndex === i ? 'COPIED!' : 'COPY'}
                          </button>
                        </div>
                        {/* SQL Text */}
                        <pre className="p-4 text-xs font-mono text-blue-400/90 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {msg.sql}
                        </pre>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-[#0f0f18]/80 backdrop-blur-md border border-white/[0.06] rounded-2xl rounded-tl-none p-5 flex items-center gap-4">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce" />
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
                </div>
                <span className="text-xs text-gray-400 font-mono">Executing SQLite Query...</span>
              </div>
            </div>
          )}
          
          <div ref={endOfMessagesRef} />
        </div>
      </div>

      {/* Input panel sticky at bottom */}
      <div className="sticky bottom-0 bg-[#07070c] border-t border-white/[0.08] pt-6 pb-6 px-4 z-20">
        <div className="max-w-4xl mx-auto">
          {/* Suggestion Chips */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar whitespace-nowrap">
            {SUGGESTIONS.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(sug)}
                disabled={loading}
                className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/10 text-gray-400 hover:text-white text-xs px-3.5 py-2 rounded-xl transition-all font-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative flex items-center group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything (e.g. 'What is the top brand in Automotive?')"
              className="w-full bg-[#0d0d15]/85 border border-white/10 rounded-2xl pl-6 pr-16 py-4.5 text-white focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 transition-all text-sm relative z-10 placeholder-gray-500 font-light"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-3.5 p-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl disabled:opacity-40 transition-all active:scale-95 z-20 shadow-md shadow-purple-500/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            </button>
          </form>
          
          <div className="text-center mt-2.5">
            <span className="text-[10px] text-gray-600 font-mono tracking-wider">SECURE QUERY SYSTEM • DATA REVALIDATES EVERY 60 MINUTES</span>
          </div>
        </div>
      </div>
    </div>
  );
}
