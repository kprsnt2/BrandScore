"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

// ── Types ───────────────────────────────────────────────────────────
interface BrandStar {
  brand: string;
  industry_id: string;
  industry_name: string;
  score: number;
  recommendation: number;
  sentiment: number;
  prominence: number;
  accuracy: number;
  // Galaxy position & physics
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  radius: number;
  twinklePhase: number;
  twinkleSpeed: number;
  orbitAngle: number;
  orbitSpeed: number;
  orbitRadius: number;
}

const INDUSTRY_COLORS: Record<string, string> = {
  technology: '#6366f1',
  automotive: '#f59e0b',
  ecommerce: '#10b981',
  fashion: '#ec4899',
  'food-beverage': '#f97316',
  healthcare: '#06b6d4',
  finance: '#8b5cf6',
  telecom: '#3b82f6',
  entertainment: '#e11d48',
  travel: '#14b8a6',
  energy: '#eab308',
  fmcg: '#22c55e',
  realestate: '#a855f7',
  edtech: '#0ea5e9',
  logistics: '#64748b',
  'consumer-electronics': '#7c3aed',
  'mobile-phones': '#2563eb',
  'home-appliances': '#059669',
  'two-wheelers': '#dc2626',
};

function getColor(id: string): string {
  return INDUSTRY_COLORS[id] || '#6366f1';
}

// ── Galaxy Page ─────────────────────────────────────────────────────
export default function GalaxyPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<BrandStar[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const hoveredRef = useRef<BrandStar | null>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [hovered, setHovered] = useState<BrandStar | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ brands: 0, industries: 0 });

  // Fetch brand data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/intelligence');
        if (!res.ok) return;
        const data = await res.json();

        // We need individual brand scores — fetch from /api/brands for each industry
        const allStars: BrandStar[] = [];
        const industries = data.industryLeaderboard || [];
        const activeIndustries = industries.filter((i: { avg_score: number }) => i.avg_score > 0);

        // Fetch brand data for each active industry in parallel
        const brandPromises = activeIndustries.map(async (ind: { industry_id: string; industry_name: string }) => {
          try {
            const bRes = await fetch(`/api/brands?industry=${ind.industry_id}`);
            if (!bRes.ok) return [];
            const bData = await bRes.json();
            return (bData.brands || []).map((b: {
              brand: string; score: number;
              recommendation: number; sentiment: number;
              prominence: number; accuracy: number;
            }) => ({
              brand: b.brand,
              industry_id: ind.industry_id,
              industry_name: ind.industry_name,
              score: b.score,
              recommendation: b.recommendation || 0,
              sentiment: b.sentiment || 0,
              prominence: b.prominence || 0,
              accuracy: b.accuracy || 0,
            }));
          } catch { return []; }
        });

        const brandArrays = await Promise.all(brandPromises);
        const allBrands = brandArrays.flat().filter((b: { score: number }) => b.score > 0);

        // Position brands in galaxy clusters
        const industryCount = activeIndustries.length;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const galaxyRadius = Math.min(centerX, centerY) * 0.7;

        activeIndustries.forEach((ind: { industry_id: string }, iIdx: number) => {
          const angle = (iIdx / industryCount) * Math.PI * 2 - Math.PI / 2;
          const clusterCX = centerX + Math.cos(angle) * galaxyRadius * 0.55;
          const clusterCY = centerY + Math.sin(angle) * galaxyRadius * 0.55;

          const industryBrands = allBrands.filter((b: { industry_id: string }) => b.industry_id === ind.industry_id);
          industryBrands.forEach((b: {
            brand: string; industry_id: string; industry_name: string;
            score: number; recommendation: number; sentiment: number;
            prominence: number; accuracy: number;
          }, bIdx: number) => {
            const bAngle = (bIdx / Math.max(industryBrands.length, 1)) * Math.PI * 2 + Math.random() * 0.5;
            const dist = 30 + Math.random() * 80 + (1 - b.score / 100) * 40;
            const x = clusterCX + Math.cos(bAngle) * dist;
            const y = clusterCY + Math.sin(bAngle) * dist;
            const radius = 2 + (b.score / 100) * 5;

            allStars.push({
              ...b,
              x, y,
              vx: 0, vy: 0,
              baseX: x, baseY: y,
              radius,
              twinklePhase: Math.random() * Math.PI * 2,
              twinkleSpeed: 0.5 + Math.random() * 2,
              orbitAngle: bAngle,
              orbitSpeed: 0.0003 + Math.random() * 0.0008,
              orbitRadius: dist,
            });
          });
        });

        starsRef.current = allStars;
        setStats({ brands: allStars.length, industries: activeIndustries.length });
        setLoading(false);
      } catch (e) {
        console.error('Galaxy load error:', e);
        setLoading(false);
      }
    }
    load();
  }, []);

  // Canvas animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const stars = starsRef.current;
    const mouse = mouseRef.current;
    timeRef.current += 1;
    const t = timeRef.current;

    // Clear with trail effect
    ctx.fillStyle = 'rgba(5, 5, 12, 0.15)';
    ctx.fillRect(0, 0, W, H);

    // Background nebula glow
    if (t % 3 === 0) {
      const industries = [...new Set(stars.map(s => s.industry_id))];
      for (const indId of industries) {
        const indStars = stars.filter(s => s.industry_id === indId);
        if (indStars.length === 0) continue;
        const cx = indStars.reduce((s, st) => s + st.x, 0) / indStars.length;
        const cy = indStars.reduce((s, st) => s + st.y, 0) / indStars.length;
        const color = getColor(indId);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
        grad.addColorStop(0, color + '08');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(cx - 150, cy - 150, 300, 300);
      }
    }

    let newHovered: BrandStar | null = null;

    for (const star of stars) {
      // Orbital motion
      star.orbitAngle += star.orbitSpeed;
      const centerX = W / 2;
      const centerY = H / 2;

      // Subtle drift back to orbit position
      const targetX = star.baseX + Math.cos(star.orbitAngle) * 3;
      const targetY = star.baseY + Math.sin(star.orbitAngle) * 3;
      star.x += (targetX - star.x) * 0.01;
      star.y += (targetY - star.y) * 0.01;

      // Mouse gravity effect
      if (mouse.active) {
        const dx = mouse.x - star.x;
        const dy = mouse.y - star.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 5) {
          const force = 0.5 / (dist * 0.1);
          star.x += dx * force * 0.3;
          star.y += dy * force * 0.3;
        }
      }

      // Twinkle
      const twinkle = 0.5 + 0.5 * Math.sin(t * 0.03 * star.twinkleSpeed + star.twinklePhase);
      const alpha = 0.3 + twinkle * 0.7;
      const r = star.radius * (0.8 + twinkle * 0.4);
      const color = getColor(star.industry_id);

      // Check hover
      if (mouse.active) {
        const dx = mouse.x - star.x;
        const dy = mouse.y - star.y;
        if (Math.sqrt(dx * dx + dy * dy) < Math.max(r * 2.5, 10)) {
          newHovered = star;
        }
      }

      const isHovered = newHovered === star;

      // Draw glow
      if (star.score >= 70 || isHovered) {
        const glowR = isHovered ? r * 6 : r * 3;
        const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowR);
        glow.addColorStop(0, color + (isHovered ? '40' : '18'));
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(star.x, star.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw star
      ctx.beginPath();
      ctx.arc(star.x, star.y, isHovered ? r * 2 : r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = isHovered ? 1 : alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Bright core
      if (star.score >= 60) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
        ctx.fill();
      }

      // Draw brand name for hovered or top brands
      if (isHovered) {
        ctx.font = 'bold 13px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(star.brand, star.x, star.y - r * 2.5 - 8);
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(`Score: ${star.score} · ${star.industry_name}`, star.x, star.y - r * 2.5 + 6);
      }
    }

    // Draw connecting lines between close stars in same industry
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        if (stars[i].industry_id !== stars[j].industry_id) continue;
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60) {
          ctx.globalAlpha = 1 - dist / 60;
          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[j].x, stars[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    if (newHovered !== hoveredRef.current) {
      hoveredRef.current = newHovered;
      setHovered(newHovered);
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Clear fully on resize
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#05050c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const handleLeave = () => {
      mouseRef.current = { ...mouseRef.current, active: false };
    };

    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('mouseleave', handleLeave);

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('mouseleave', handleLeave);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [animate]);

  // Click handler
  const handleClick = useCallback(() => {
    if (hoveredRef.current) {
      window.location.href = `/brand/${encodeURIComponent(hoveredRef.current.brand)}`;
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05050c]" style={{ cursor: hovered ? 'pointer' : 'crosshair' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onClick={handleClick}
      />

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-16 h-16 border-[3px] border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-6" />
            <p className="text-gray-400 text-sm">Generating brand universe...</p>
          </div>
        </div>
      )}

      {/* Top-left: Title */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-lg sm:text-xl font-bold text-white/80">
          Brand Galaxy
        </h1>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {stats.brands} brands · {stats.industries} industries · hover to explore
        </p>
      </div>

      {/* Top-right: Navigation */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Link href="/analytics" className="text-[10px] text-gray-500 hover:text-white transition-colors bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5 rounded-lg">
          Analytics
        </Link>
        <Link href="/dashboard" className="text-[10px] text-gray-500 hover:text-white transition-colors bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5 rounded-lg">
          Dashboard
        </Link>
      </div>

      {/* Bottom: Legend */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <div className="flex flex-wrap gap-x-3 gap-y-1 max-w-md">
          {Object.entries(INDUSTRY_COLORS).slice(0, 10).map(([id, color]) => (
            <div key={id} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
              <span className="text-[9px] text-gray-600 capitalize">{id.replace(/-/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hovered brand info card */}
      {hovered && (
        <div className="absolute bottom-4 right-4 z-10 bg-gray-900/90 border border-white/10 rounded-xl p-4 backdrop-blur-sm w-56 pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(hovered.industry_id), boxShadow: `0 0 8px ${getColor(hovered.industry_id)}` }} />
            <h3 className="text-sm font-bold text-white truncate">{hovered.brand}</h3>
          </div>
          <p className="text-[10px] text-gray-500 mb-3">{hovered.industry_name}</p>

          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-2xl font-bold text-white tabular-nums">{hovered.score}</span>
            <span className="text-[10px] text-gray-500">/100</span>
          </div>

          <div className="space-y-1.5">
            {[
              { label: 'Recommendation', val: hovered.recommendation, max: 40 },
              { label: 'Sentiment', val: hovered.sentiment, max: 30 },
              { label: 'Prominence', val: hovered.prominence, max: 20 },
              { label: 'Accuracy', val: hovered.accuracy, max: 10 },
            ].map(d => (
              <div key={d.label}>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-gray-500">{d.label}</span>
                  <span className="text-gray-400 tabular-nums">{d.val}/{d.max}</span>
                </div>
                <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${(d.val / d.max) * 100}%`,
                    backgroundColor: getColor(hovered.industry_id),
                  }} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[9px] text-gray-600 mt-3 text-center">Click to view brand details →</p>
        </div>
      )}
    </div>
  );
}
