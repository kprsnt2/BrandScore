/**
 * Generates a weekly AI brand visibility report.
 * Uses the NVIDIA/Groq LLM to write a professional markdown blog post
 * based on the top 5 brands and top movers over the last 7 days.
 */

import { generateInsight } from '../src/lib/insights';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('📰 AI Weekly Report Generator');
  console.log('==================================');

  const dbPath = path.join(process.cwd(), 'data', 'brand-intelligence.db');
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database not found at ${dbPath}`);
    process.exit(1);
  }

  const db = new Database(dbPath);

  // Ensure table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content_md TEXT NOT NULL,
      published_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const dateStr = new Date().toISOString().split('T')[0];
  const slug = `weekly-report-${dateStr}`;

  // Check if report already exists for today
  const existing = db.prepare('SELECT id FROM reports WHERE slug = ?').get(slug);
  if (existing) {
    console.log(`✅ Report for ${dateStr} already exists. Skipping.`);
    process.exit(0);
  }

  console.log('📊 Gathering data for the last 7 days...');

  // Get last 7 runs
  const runs = db.prepare(`SELECT id, run_date FROM pipeline_runs ORDER BY id DESC LIMIT 7`).all() as { id: number; run_date: string }[];
  if (runs.length < 2) {
    console.error('❌ Not enough pipeline runs to generate a weekly report. Need at least 2.');
    process.exit(1);
  }

  const latestRunId = runs[0].id;
  const oldestRunId = runs[runs.length - 1].id;

  // 1. Top 5 Brands Overall (Latest run)
  const topBrands = db.prepare(`
    SELECT brand, industry_id, score 
    FROM brand_results 
    WHERE run_id = ? AND model IS NULL AND score > 0 
    ORDER BY score DESC LIMIT 5
  `).all(latestRunId) as { brand: string; industry_id: string; score: number }[];

  // 2. Top Movers (Latest vs Oldest)
  const movers = db.prepare(`
    SELECT 
      l.brand, l.industry_id, 
      l.score as current_score, 
      o.score as old_score,
      (l.score - o.score) as score_change
    FROM brand_results l
    INNER JOIN brand_results o ON l.brand = o.brand AND l.industry_id = o.industry_id
    WHERE l.run_id = ? AND o.run_id = ? AND l.model IS NULL AND o.model IS NULL AND l.score > 0 AND o.score > 0
    ORDER BY score_change DESC
  `).all(latestRunId, oldestRunId) as { brand: string; industry_id: string; current_score: number; old_score: number; score_change: number }[];

  const topImprovers = movers.filter(m => m.score_change > 0).slice(0, 5);
  const topDecliners = movers.filter(m => m.score_change < 0).sort((a, b) => a.score_change - b.score_change).slice(0, 5);

  // 3. Construct Prompt
  const prompt = `You are a Lead AI Data Analyst for "rAsh Score", a platform that measures how visible and positively perceived Indian brands are by Large Language Models (LLMs).

Write a professional and analytical weekly report (formatted as a Markdown blog post) summarizing the state of AI brand visibility for the week of ${dateStr}.
The report should be around 400-500 words. Use Markdown headings, bold text for brand names, and bullet points where appropriate. DO NOT use emojis excessively, keep it highly professional.
Do not output any introductory or conversational text, just the raw Markdown content starting with the title as an H1 heading (#).

Data for this week:

TOP 5 BRANDS OVERALL:
${topBrands.map((b, i) => `${i + 1}. ${b.brand} (${b.industry_id}) - Score: ${b.score}/100`).join('\n')}

TOP 5 IMPROVERS THIS WEEK:
${topImprovers.map((b, i) => `${i + 1}. ${b.brand} (${b.industry_id}) - Score: ${b.current_score} (Up +${b.score_change})`).join('\n')}

TOP 5 DECLINERS THIS WEEK:
${topDecliners.map((b, i) => `${i + 1}. ${b.brand} (${b.industry_id}) - Score: ${b.current_score} (Down ${b.score_change})`).join('\n')}

Guidelines:
1. Start with an H1 heading (#) that is a catchy but professional title for the report.
2. Write a brief executive summary.
3. Analyze the top 5 brands and what their dominance means.
4. Discuss the improvers and decliners, theorizing briefly why their AI visibility might be fluctuating (e.g., recent news, product launches, or algorithmic shifts).
5. Conclude with a brief forward-looking statement on the importance of LLMO (Large Language Model Optimization).`;

  console.log('✍️  Generating report via AI...');
  try {
    const { text, generatedBy } = await generateInsight(prompt);
    
    // Extract title from first line
    const lines = text.trim().split('\n');
    let title = 'Weekly AI Brand Visibility Report';
    if (lines[0].startsWith('# ')) {
      title = lines[0].replace('# ', '').trim();
    }

    const insert = db.prepare(`
      INSERT INTO reports (slug, title, content_md)
      VALUES (?, ?, ?)
    `);

    insert.run(slug, title, text);

    console.log(`✅ Successfully generated and saved report: ${slug}`);
    console.log(`🤖 Generated by: ${generatedBy}`);
    
  } catch (error) {
    console.error('❌ Failed to generate report:', error);
    process.exit(1);
  }
}

main().catch(console.error);
