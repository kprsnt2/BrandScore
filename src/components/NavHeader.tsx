"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '/intelligence', label: 'Intelligence', mobileVisible: true },
  { href: '/analytics', label: 'Analytics', mobileVisible: true },
  { href: '/reports', label: 'Reports', mobileVisible: true },
  { href: '/arena', label: 'Arena', mobileVisible: true },
  { href: '/chat', label: 'Ask AI ✨', mobileVisible: true, highlight: true },
];

export default function NavHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <header className="border-b border-gray-800 backdrop-blur-sm bg-gray-900/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 sm:py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="rAsh Score Home">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs sm:text-sm">rS</span>
            </div>
            <span className="font-bold text-base sm:text-xl gradient-text hidden sm:block">rAsh Score</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-5 text-sm text-gray-400 items-center" aria-label="Main navigation">
            <Link
              href="/"
              className={`transition-colors ${isActive('/') && pathname === '/' ? 'text-white font-medium' : 'hover:text-white'}`}
            >
              Home
            </Link>
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  isActive(link.href)
                    ? link.highlight ? 'text-purple-300 font-semibold' : 'text-white font-medium'
                    : link.highlight ? 'text-purple-400 font-medium hover:text-purple-300' : 'hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className={`px-4 py-1.5 rounded-lg font-medium text-sm transition-all ${
                isActive('/dashboard')
                  ? 'bg-gradient-to-r from-primary-400 to-purple-500 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-gradient-to-r from-primary-500 to-purple-600 text-white hover:shadow-lg hover:shadow-primary-500/25'
              }`}
            >
              🇮🇳 India rAsh Index
            </Link>
          </nav>

          {/* Mobile: CTA + Hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-lg font-medium text-xs"
            >
              🇮🇳 Index
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 top-[57px] z-50 md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          
          {/* Menu Panel */}
          <nav className="relative bg-[#0a0a14]/98 border-b border-white/[0.06] shadow-2xl" aria-label="Mobile navigation">
            <div className="px-4 py-4 space-y-1">
              <Link
                href="/"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  pathname === '/' ? 'bg-primary-500/10 text-white border border-primary-500/20' : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                Home
              </Link>
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(link.href)
                      ? link.highlight
                        ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                        : 'bg-primary-500/10 text-white border border-primary-500/20'
                      : link.highlight
                        ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/5'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/dashboard"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive('/dashboard')
                    ? 'bg-gradient-to-r from-primary-500/20 to-purple-500/20 text-white border border-primary-500/20'
                    : 'text-primary-400 hover:bg-primary-500/5'
                }`}
              >
                🇮🇳 India rAsh Index
              </Link>
            </div>
            
            <div className="px-8 py-3 border-t border-white/[0.04]">
              <p className="text-[10px] text-gray-600 font-mono">rashscore.live</p>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
