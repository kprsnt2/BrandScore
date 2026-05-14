/**
 * AI Industry Insights Generator
 *
 * Generates daily per-industry insights using Gemini (primary)
 * with NVIDIA DeepSeek as fallback.
 *
 * Generation logic:
 * - First time (no prior insight): uses data from last 2 pipeline runs
 * - Subsequent days: uses yesterday's insight + today's new data
 *
 * Output format: bullet-point list with emojis (3–5 bullets)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnv } from './env';

export interface InsightRow {
  id: number;
  industry_id: string;
  insight_date: string;
  insight_text: string;
  generated_by: string;
  previous_insight_id: number | null;
  created_at: string;
}

export interface IndustryDataSnapshot {
  industryId: string;
  industryName: string;
  runDate: string;
  avgScore: number;
  brands: {
    brand: string;
    score: number;
    rank: number;
    scoreChange: number | null;
    rankChange: number | null;
  }[];
}

// ─── Prompt Builders ────────────────────────────────────────────────────────

function buildFirstTimePrompt(
  industryName: string,
  day1: IndustryDataSnapshot,
  day2: IndustryDataSnapshot
): string {
  const formatBrands = (snap: IndustryDataSnapshot) =>
    snap.brands
      .slice(0, 10)
      .map((b, i) => `  ${i + 1}. ${b.brand}: ${b.score}/100`)
      .join('\n');

  return `You are an AI brand intelligence analyst covering India's top brands.

Analyze the AI visibility data below for the ${industryName} industry across two days and generate exactly 4–5 bullet-point insights.

Day 1 (${day1.runDate}) – Industry avg: ${day1.avgScore}
${formatBrands(day1)}

Day 2 (${day2.runDate}) – Industry avg: ${day2.avgScore}
${formatBrands(day2)}

Rules:
- Write exactly 4–5 bullet points
- Each bullet MUST start with a relevant emoji (📈 📉 🏆 🔄 ⚠️ 🚀 💡 🎯 etc.)
- Be specific: mention brand names and actual scores/ranks
- Note who is leading, who moved up/down, and any notable trends
- Keep each bullet to 1–2 concise sentences
- Do NOT include headers, markdown bold/italic, or any text outside the bullets
- Output ONLY the bullet list, nothing else`;
}

function buildUpdatePrompt(
  industryName: string,
  prevInsight: string,
  prevDate: string,
  today: IndustryDataSnapshot
): string {
  const topBrands = today.brands
    .slice(0, 10)
    .map((b, i) => {
      const change =
        b.scoreChange !== null && b.scoreChange !== 0
          ? ` (score ${b.scoreChange > 0 ? '+' : ''}${b.scoreChange})`
          : '';
      const rankChg =
        b.rankChange !== null && b.rankChange !== 0
          ? `, rank ${b.rankChange > 0 ? '▲' : '▼'}${Math.abs(b.rankChange)}`
          : '';
      return `  ${i + 1}. ${b.brand}: ${b.score}/100${change}${rankChg}`;
    })
    .join('\n');

  return `You are an AI brand intelligence analyst covering India's top brands.

Here is yesterday's insight (${prevDate}) for the ${industryName} industry:
${prevInsight}

Today's new data (${today.runDate}) – Industry avg: ${today.avgScore}:
${topBrands}

Generate exactly 4–5 updated bullet-point insights reflecting what changed today compared to yesterday.

Rules:
- Write exactly 4–5 bullet points
- Each bullet MUST start with a relevant emoji (📈 📉 🏆 🔄 ⚠️ 🚀 💡 🎯 etc.)
- Be specific: mention brand names, scores, and rank movements
- Focus on changes: who moved up, who dropped, new leaders, surprising shifts
- Keep each bullet to 1–2 concise sentences
- Do NOT include headers, markdown bold/italic, or any text outside the bullets
- Output ONLY the bullet list, nothing else`;
}

// ─── AI Callers ──────────────────────────────────────────────────────────────

const BOTH_FAILED_RETRY_DELAY_MS = 60_000; // 1 minute — wait only when both providers fail

async function callGemini(prompt: string): Promise<string> {
  const env = getEnv();
  const apiKey = env.GEMINI_API_KEY || env.GEMINI_API_KEY_PAID;
  if (!apiKey) throw new Error('No Gemini API key configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: env.GEMINI_API_KEY_PAID ? 'gemini-2.5-pro-latest' : 'gemini-2.5-flash',
    generationConfig: { maxOutputTokens: 1024, temperature: 0.5 },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

async function callNvidiaDeepSeek(prompt: string, model = 'deepseek-ai/deepseek-v4-pro'): Promise<string> {
  const env = getEnv();
  if (!env.NVIDIA_API_KEY) throw new Error('No NVIDIA API key configured');

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`NVIDIA API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  if (!text) throw new Error('NVIDIA DeepSeek returned empty response');
  return text;
}

async function callNvidiaWithFallback(prompt: string): Promise<string> {
  try {
    return await callNvidiaDeepSeek(prompt, 'deepseek-ai/deepseek-v4-pro');
  } catch (err) {
    console.warn(`  ⚠ DeepSeek v4-pro failed, trying r1: ${(err as Error).message.split('\n')[0]}`);
    return callNvidiaDeepSeek(prompt, 'deepseek-ai/deepseek-r1');
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an insight for an industry.
 * Strategy:
 *   1. Try Gemini
 *   2. If Gemini fails (any reason, including 429/quota), immediately try NVIDIA DeepSeek
 *   3. If both fail, wait 60s and attempt one more full cycle (Gemini → DeepSeek)
 *   4. If still both fail, throw
 */
export async function generateInsight(
  prompt: string
): Promise<{ text: string; generatedBy: 'gemini' | 'nvidia-deepseek' }> {
  async function tryCycle(): Promise<{ text: string; generatedBy: 'gemini' | 'nvidia-deepseek' } | null> {
    // 1. Try Gemini
    try {
      const text = await callGemini(prompt);
      return { text, generatedBy: 'gemini' };
    } catch (geminiErr) {
      const msg = (geminiErr as Error).message || '';
      const isQuota = msg.includes('429') || msg.includes('quota');
      console.warn(`  ⚠ Gemini failed${isQuota ? ' (quota/rate-limit)' : ''}: ${msg.split('\n')[0]}`);
    }

    // 2. Immediately try NVIDIA DeepSeek (v4-pro → r1 fallback)
    try {
      console.log('  ⏩ Trying NVIDIA DeepSeek fallback...');
      const text = await callNvidiaWithFallback(prompt);
      return { text, generatedBy: 'nvidia-deepseek' };
    } catch (deepseekErr) {
      console.warn(`  ⚠ DeepSeek failed: ${(deepseekErr as Error).message.split('\n')[0]}`);
    }

    return null; // Both failed this cycle
  }

  // First attempt
  const first = await tryCycle();
  if (first) return first;

  // Both failed — wait 60s then try one more time
  console.warn(`  ⏳ Both providers failed — waiting ${BOTH_FAILED_RETRY_DELAY_MS / 1000}s before retry...`);
  await new Promise(resolve => setTimeout(resolve, BOTH_FAILED_RETRY_DELAY_MS));

  const second = await tryCycle();
  if (second) return second;

  throw new Error('Both Gemini and NVIDIA DeepSeek failed after retry');
}

/**
 * Build the appropriate prompt based on whether a previous insight exists.
 */
export function buildInsightPrompt(
  industryName: string,
  todaySnapshot: IndustryDataSnapshot,
  previousSnapshot: IndustryDataSnapshot | null,
  previousInsight: { text: string; date: string } | null
): string {
  if (!previousInsight || !previousSnapshot) {
    // First time — need two snapshots
    if (previousSnapshot) {
      return buildFirstTimePrompt(industryName, previousSnapshot, todaySnapshot);
    }
    // Only one day of data — use simplified prompt
    return buildUpdatePrompt(industryName, '', '', todaySnapshot);
  }

  return buildUpdatePrompt(
    industryName,
    previousInsight.text,
    previousInsight.date,
    todaySnapshot
  );
}
