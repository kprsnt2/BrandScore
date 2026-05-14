/**
 * Standalone pipeline runner for GitHub Actions
 * Analyzes top 15 brands across 15 Indian industries
 * Saves results to SQLite database (single source of truth)
 */

import { BrandAnalysisPipeline } from '../src/lib/pipeline';
import { getAllIndustries } from '../src/lib/industry-data';
import { hasApiKeys } from '../src/lib/env';
import { buildInsightPrompt, generateInsight, type IndustryDataSnapshot } from '../src/lib/insights';
import type { IndustryAnalysisResult } from '../src/lib/pipeline';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

function initDatabase(dbPath: string) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_date TEXT NOT NULL,
      total_industries INTEGER,
      total_brands INTEGER,
      successful_brands INTEGER,
      average_score REAL,
      highest_score INTEGER,
      lowest_score INTEGER,
      total_time_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS industry_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      industry_id TEXT NOT NULL,
      industry_name TEXT NOT NULL,
      avg_score REAL,
      avg_recommendation REAL,
      avg_sentiment REAL,
      avg_prominence REAL,
      avg_accuracy REAL,
      total_brands INTEGER,
      successful_brands INTEGER,
      response_time_ms INTEGER,
      error TEXT,
      FOREIGN KEY (run_id) REFERENCES pipeline_runs(id)
    );

    CREATE TABLE IF NOT EXISTS brand_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      industry_id TEXT NOT NULL,
      brand TEXT NOT NULL,
      category TEXT,
      score INTEGER,
      recommendation INTEGER,
      sentiment INTEGER,
      prominence INTEGER,
      accuracy INTEGER,
      response_time_ms INTEGER,
      error TEXT,
      model TEXT,
      FOREIGN KEY (run_id) REFERENCES pipeline_runs(id)
    );

    CREATE TABLE IF NOT EXISTS industry_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      industry_id TEXT NOT NULL,
      insight_date TEXT NOT NULL,
      insight_text TEXT NOT NULL,
      generated_by TEXT NOT NULL,
      previous_insight_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(industry_id, insight_date)
    );

    CREATE INDEX IF NOT EXISTS idx_insights_industry ON industry_insights(industry_id);
    CREATE INDEX IF NOT EXISTS idx_insights_date ON industry_insights(insight_date);

    CREATE INDEX IF NOT EXISTS idx_brand_results_run ON brand_results(run_id);
    CREATE INDEX IF NOT EXISTS idx_brand_results_industry ON brand_results(industry_id);
    CREATE INDEX IF NOT EXISTS idx_brand_results_model ON brand_results(model);
    CREATE INDEX IF NOT EXISTS idx_industry_results_run ON industry_results(run_id);
  `);

  // Add model column if it doesn't exist (migration for existing DBs)
  try {
    db.exec(`ALTER TABLE brand_results ADD COLUMN model TEXT`);
    console.log('✅ Added model column to brand_results');
  } catch {
    // Column already exists — this is expected
  }

  return db;
}

// ─── Insight Generation ───────────────────────────────────────────────────────

/**
 * Build a snapshot of brand data from pipeline results for a given industry.
 */
function buildSnapshot(
  industryId: string,
  industryName: string,
  runDate: string,
  results: IndustryAnalysisResult,
  prevResults: { brand: string; score: number }[] = []
): IndustryDataSnapshot {
  const prevMap: Record<string, { score: number; rank: number }> = {};
  prevResults.forEach((b, i) => {
    prevMap[b.brand] = { score: b.score, rank: i + 1 };
  });

  const sortedBrands = [...results.brandResults]
    .filter(b => !b.error && b.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    industryId,
    industryName,
    runDate,
    avgScore: results.industryAverage.score,
    brands: sortedBrands.map((b, i) => {
      const prev = prevMap[b.brand];
      return {
        brand: b.brand,
        score: b.score,
        rank: i + 1,
        scoreChange: prev ? b.score - prev.score : null,
        rankChange: prev ? prev.rank - (i + 1) : null,
      };
    }),
  };
}

/**
 * After all brand/industry data is saved, generate and store one insight
 * per industry. Skips any industry that already has today's insight.
 */
async function generateAndSaveInsights(
  db: Database.Database,
  runId: bigint | number,
  results: IndustryAnalysisResult[],
  dateStr: string
): Promise<void> {
  console.log('\n🤖 Generating AI insights for each industry...');

  const insertInsight = db.prepare(`
    INSERT OR IGNORE INTO industry_insights
      (industry_id, insight_date, insight_text, generated_by, previous_insight_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const industryResult of results) {
    const { industry } = industryResult;
    if (industryResult.brandResults.filter(b => !b.error).length === 0) {
      console.log(`  ⏭  ${industry.name}: no brand data, skipping insight`);
      continue;
    }

    // Check if today's insight already exists
    const existing = db.prepare(
      `SELECT id FROM industry_insights WHERE industry_id = ? AND insight_date = ?`
    ).get(industry.id, dateStr) as { id: number } | undefined;

    if (existing) {
      console.log(`  ✅ ${industry.name}: insight already exists for today, skipping`);
      continue;
    }

    try {
      // Get previous run data for this industry (from DB)
      const prevBrandRows = db.prepare(`
        SELECT br.brand, br.score
        FROM brand_results br
        INNER JOIN pipeline_runs pr ON br.run_id = pr.id
        WHERE br.industry_id = ? AND br.model IS NULL AND br.score > 0
          AND pr.run_date < ?
        ORDER BY pr.run_date DESC, br.score DESC
        LIMIT 30
      `).all(industry.id, dateStr) as { brand: string; score: number }[];

      // Get previous insight if any
      const prevInsightRow = db.prepare(`
        SELECT id, insight_text, insight_date
        FROM industry_insights
        WHERE industry_id = ?
        ORDER BY insight_date DESC
        LIMIT 1
      `).get(industry.id) as { id: number; insight_text: string; insight_date: string } | undefined;

      // Build today's snapshot
      const todaySnapshot = buildSnapshot(
        industry.id, industry.name, dateStr, industryResult, prevBrandRows
      );

      // Build previous snapshot from DB rows (if available)
      let prevSnapshot: IndustryDataSnapshot | null = null;
      if (prevBrandRows.length > 0) {
        // Get the date of the last run for this industry
        const prevRunDate = (db.prepare(`
          SELECT pr.run_date
          FROM brand_results br
          INNER JOIN pipeline_runs pr ON br.run_id = pr.id
          WHERE br.industry_id = ? AND br.model IS NULL AND pr.run_date < ?
          ORDER BY pr.run_date DESC
          LIMIT 1
        `).get(industry.id, dateStr) as { run_date: string } | undefined)?.run_date || '';

        const prevIndustryRow = db.prepare(`
          SELECT avg_score FROM industry_results
          INNER JOIN pipeline_runs ON industry_results.run_id = pipeline_runs.id
          WHERE industry_results.industry_id = ? AND pipeline_runs.run_date = ?
        `).get(industry.id, prevRunDate) as { avg_score: number } | undefined;

        prevSnapshot = {
          industryId: industry.id,
          industryName: industry.name,
          runDate: prevRunDate,
          avgScore: prevIndustryRow?.avg_score || 0,
          brands: prevBrandRows.map((b, i) => ({
            brand: b.brand, score: b.score, rank: i + 1,
            scoreChange: null, rankChange: null,
          })),
        };
      }

      const prevInsight = prevInsightRow
        ? { text: prevInsightRow.insight_text, date: prevInsightRow.insight_date }
        : null;

      const prompt = buildInsightPrompt(
        industry.name, todaySnapshot, prevSnapshot, prevInsight
      );

      console.log(`  🧠 Generating insight for ${industry.name}...`);
      const { text, generatedBy } = await generateInsight(prompt);

      insertInsight.run(
        industry.id, dateStr, text, generatedBy, prevInsightRow?.id || null
      );
      console.log(`  ✅ ${industry.name}: insight saved (${generatedBy})`);

      // Small delay between industries to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.error(`  ❌ ${industry.name}: insight generation failed:`, (err as Error).message);
    }
  }

  console.log('✅ All insights processed.\n');
}

async function main() {
  console.log('🇮🇳 India rAsh Intelligence Pipeline');
  console.log('=====================================');

  // === Pre-flight: check that at least one API key is configured ===
  const keys = hasApiKeys();
  const activeProviders = Object.entries(keys).filter(([, v]) => v).map(([k]) => k);

  if (activeProviders.length === 0) {
    console.error('\n❌ No API keys configured!');
    console.error('Please add at least one of these GitHub Secrets:');
    console.error('  • GEMINI_API_KEY');
    console.error('  • GROQ_API_KEY');
    console.error('  • NVIDIA_API_KEY');
    console.error('\nSkipping pipeline run to preserve existing data.');
    process.exit(0); // Exit cleanly so the workflow doesn't fail
  }

  console.log(`✅ Active providers: ${activeProviders.join(', ')}`);

  const industries = getAllIndustries();
  const totalBrandCount = industries.reduce((s, i) => s + i.topBrands.length, 0);
  console.log(`📊 ${industries.length} industries, ${totalBrandCount} brands total`);

  const pipeline = new BrandAnalysisPipeline({
    delayBetweenIndustries: 10000,  // 10s between industries to respect rate limits
    timeoutMs: 180000,              // 3 min per-model timeout (Gemini thinks long)
  });

  console.log('\n🚀 Starting analysis...\n');
  const startTime = Date.now();
  const results = await pipeline.analyzeAllIndustries();
  const totalTime = Date.now() - startTime;

  // Calculate summary
  const allBrands = results.flatMap(r => r.brandResults);
  const successfulBrands = allBrands.filter(b => !b.error);
  const failedIndustries = results.filter(r => r.error);

  const summary = {
    totalIndustries: results.length,
    successfulIndustries: results.length - failedIndustries.length,
    totalBrands: allBrands.length,
    successfulBrands: successfulBrands.length,
    failedBrands: allBrands.length - successfulBrands.length,
    averageScore: successfulBrands.length > 0
      ? Math.round(successfulBrands.reduce((sum, b) => sum + b.score, 0) / successfulBrands.length) : 0,
    highestScore: successfulBrands.length > 0 ? Math.max(...successfulBrands.map(b => b.score)) : 0,
    lowestScore: successfulBrands.length > 0 ? Math.min(...successfulBrands.map(b => b.score)) : 0,
    totalTimeMs: totalTime,
  };

  // === Guard: don't overwrite good data with empty results ===
  if (successfulBrands.length === 0) {
    console.error('\n⚠️ All brands failed analysis. Keeping existing data.');
    console.error('Check your API keys and rate limits.');
    process.exit(0);
  }

  const dateStr = new Date().toISOString().split('T')[0];

  // === Save to SQLite (single source of truth) ===
  const dbDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, 'brand-intelligence.db');
  const db = initDatabase(dbPath);

  const insertRun = db.prepare(`
    INSERT INTO pipeline_runs (run_date, total_industries, total_brands, successful_brands, average_score, highest_score, lowest_score, total_time_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertIndustry = db.prepare(`
    INSERT INTO industry_results (run_id, industry_id, industry_name, avg_score, avg_recommendation, avg_sentiment, avg_prominence, avg_accuracy, total_brands, successful_brands, response_time_ms, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBrand = db.prepare(`
    INSERT INTO brand_results (run_id, industry_id, brand, category, score, recommendation, sentiment, prominence, accuracy, response_time_ms, error, model)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const runResult = insertRun.run(
    dateStr, summary.totalIndustries, summary.totalBrands, summary.successfulBrands,
    summary.averageScore, summary.highestScore, summary.lowestScore, summary.totalTimeMs
  );
  const runId = runResult.lastInsertRowid;

  const saveAll = db.transaction(() => {
    for (const result of results) {
      const validBrands = result.brandResults.filter(b => !b.error);
      insertIndustry.run(
        runId, result.industry.id, result.industry.name,
        result.industryAverage.score, result.industryAverage.recommendation,
        result.industryAverage.sentiment, result.industryAverage.prominence,
        result.industryAverage.accuracy,
        result.brandResults.length, validBrands.length,
        result.totalResponseTime, result.error || null
      );

      // Insert aggregated scores (model = NULL) — these are the "All Models" average
      for (const brand of result.brandResults) {
        insertBrand.run(
          runId, result.industry.id, brand.brand, brand.category,
          brand.score, brand.breakdown.recommendation, brand.breakdown.sentiment,
          brand.breakdown.prominence, brand.breakdown.accuracy,
          brand.responseTime, brand.error || null, null  // model = NULL for aggregated
        );
      }

      // Insert per-model scores
      if (result.modelData) {
        for (const md of result.modelData) {
          for (const bs of md.brandScores) {
            const totalScore = Math.min(100,
              bs.breakdown.recommendation + bs.breakdown.sentiment +
              bs.breakdown.prominence + bs.breakdown.accuracy
            );
            insertBrand.run(
              runId, result.industry.id, bs.brand, result.industry.category,
              totalScore, bs.breakdown.recommendation, bs.breakdown.sentiment,
              bs.breakdown.prominence, bs.breakdown.accuracy,
              0, null, md.model  // model = model name for per-model rows
            );
          }
        }
      }
    }
  });

  saveAll();

  // Generate and save AI insights for each industry
  await generateAndSaveInsights(db, runId, results, dateStr);

  // Checkpoint WAL into main DB and switch to DELETE mode
  // so the .db file is fully self-contained (no .db-wal/.db-shm needed)
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.pragma('journal_mode = DELETE');

  db.close();
  console.log(`\n💾 SQLite database saved to ${dbPath}`);

  // Print summary
  console.log('\n📊 Pipeline Summary');
  console.log('===================');
  console.log(`Industries: ${summary.successfulIndustries}/${summary.totalIndustries}`);
  console.log(`Brands: ${summary.successfulBrands}/${summary.totalBrands}`);
  console.log(`Average Score: ${summary.averageScore}/100`);
  console.log(`Range: ${summary.lowestScore} - ${summary.highestScore}`);
  console.log(`Time: ${Math.round(totalTime / 1000)}s`);

  if (failedIndustries.length > 0) {
    console.log(`\n⚠️ Failed: ${failedIndustries.map(r => r.industry.name).join(', ')}`);
  }

  const topBrands = successfulBrands.sort((a, b) => b.score - a.score).slice(0, 10);
  console.log('\n🏆 Top 10 Brands:');
  topBrands.forEach((b, i) => console.log(`  ${i + 1}. ${b.brand} (${b.category}) — ${b.score}`));

  console.log('\n✅ Pipeline complete!');
}

main().catch(err => { console.error('❌ Pipeline failed:', err); process.exit(1); });
