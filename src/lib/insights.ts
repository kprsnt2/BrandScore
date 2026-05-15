/**
 * AI Industry Insights Generator
 *
 * Generates daily per-industry insights using Gemini (primary).
 *
 * Generation logic:
 * - First time (no prior insight): uses data from last 2 pipeline runs
 * - Subsequent days: uses yesterday's insight + today's new data
 *
 * Fallback chain: gemini-2.5-flash → gemini-2.0-flash-lite
 * If both fail, wait 60 s then retry: flash → flash-lite
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

const MODEL_RETRY_DELAY_MS = 60_000; // 60s wait between each failed model attempt

type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.0-flash' | 'gemini-2.0-flash-lite';

async function callGeminiModel(prompt: string, geminiModel: GeminiModel): Promise<string> {
  const env = getEnv();
  const apiKey = env.GEMINI_API_KEY || env.GEMINI_API_KEY_PAID;
  if (!apiKey) throw new Error('No Gemini API key configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: { maxOutputTokens: 1024, temperature: 0.5 },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  if (!text) throw new Error(`${geminiModel} returned empty response`);
  return text;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an insight for an industry.
 * Fallback chain (60s wait between each failed attempt):
 *   1. gemini-2.5-flash   (most capable flash)
 *   2. gemini-2.0-flash   (previous flash)
 *   3. gemini-2.0-flash-lite (lightest, highest quota)
 * Throws if all three fail.
 */
export async function generateInsight(
  prompt: string
): Promise<{ text: string; generatedBy: string }> {
  const models: { id: GeminiModel; label: string }[] = [
    { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  ];

  for (let i = 0; i < models.length; i++) {
    const { id, label } = models[i];
    try {
      if (i > 0) console.log(`  ⏩ Trying ${label} fallback...`);
      const text = await callGeminiModel(prompt, id);
      return { text, generatedBy: id };
    } catch (err) {
      const msg = (err as Error).message || '';
      const isQuota = msg.includes('429') || msg.includes('quota');
      console.warn(`  ⚠ ${label} failed${isQuota ? ' (quota/rate-limit)' : ''}: ${msg.split('\n')[0]}`);

      // Wait 60s before trying the next model (skip wait after the last model)
      if (i < models.length - 1) {
        console.warn(`  ⏳ Waiting ${MODEL_RETRY_DELAY_MS / 1000}s before trying next model...`);
        await new Promise(resolve => setTimeout(resolve, MODEL_RETRY_DELAY_MS));
      }
    }
  }

  throw new Error('All Gemini models (2.5-flash, 2.0-flash, 2.0-flash-lite) failed');
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
