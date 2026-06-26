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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am the rAsh Score AI. I have direct access to the database. Ask me anything about brands, scores, anomalies, or trends.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
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
        { role: 'assistant', content: \`⚠️ **Error:** \${err instanceof Error ? err.message : 'Something went wrong.'}\` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-16 z-20">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-500">💬</span> Ask the Data
          </h1>
          <p className="text-xs text-gray-400">Natural Language to SQL Engine</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={\`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}\`}>
              <div 
                className={\`max-w-[90%] sm:max-w-[80%] rounded-2xl px-5 py-4 \${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-white/[0.05] border border-white/10 text-gray-200 rounded-tl-sm'
                }\`}
              >
                {msg.role === 'assistant' && msg.generatedBy && (
                  <div className="text-[10px] text-gray-500 font-mono mb-2 flex items-center gap-2">
                    🤖 {msg.generatedBy}
                  </div>
                )}
                
                <div className={\`prose prose-sm max-w-none \${msg.role === 'user' ? 'prose-invert text-white' : 'prose-invert prose-p:text-gray-300'}\`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* Show SQL execution details (expandable) for debugging/portfolio flex */}
                {msg.sql && (
                  <details className="mt-4 pt-4 border-t border-white/10 text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-400 transition-colors focus:outline-none">
                      Show Generated SQL
                    </summary>
                    <div className="mt-2 bg-black/50 p-3 rounded-lg overflow-x-auto">
                      <pre className="text-blue-400 font-mono">{msg.sql}</pre>
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                </div>
                <span className="text-sm text-gray-400">Analyzing database...</span>
              </div>
            </div>
          )}
          
          <div ref={endOfMessagesRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f] to-transparent pt-10 pb-6 px-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything (e.g. 'What is the top brand in Automotive?')"
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/[0.05] transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-gray-500">AI can make mistakes. Verify important metrics on the Dashboard.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
