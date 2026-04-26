/**
 * Standalone pipeline runner for GitHub Actions
 * Analyzes top 15 brands across 15 Indian industries
 * Saves results to SQLite database + JSON file
 */

import { BrandAnalysisPipeline } from '../src/lib/pipeline';
import { getAllIndustries } from '../src/lib/industry-data';
import { hasApiKeys } from '../src/lib/env';
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
      FOREIGN KEY (run_id) REFERENCES pipeline_runs(id)
    );

    CREATE INDEX IF NOT EXISTS idx_brand_results_run ON brand_results(run_id);
    CREATE INDEX IF NOT EXISTS idx_brand_results_industry ON brand_results(industry_id);
    CREATE INDEX IF NOT EXISTS idx_industry_results_run ON industry_results(run_id);
  `);

  return db;
}

async function main() {
  console.log('🇮🇳 India Brand Intelligence Pipeline');
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
    maxConcurrentBrands: 2,
    delayBetweenRequests: 2000,
    timeoutMs: 90000,
    retryAttempts: 2
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

  const output = { results, summary, timestamp: new Date().toISOString(), version: '1.0.0' };

  // === Save to JSON ===
  const dataDir = path.join(process.cwd(), 'public', 'data');
  const historyDir = path.join(dataDir, 'history');
  fs.mkdirSync(historyDir, { recursive: true });

  fs.writeFileSync(path.join(dataDir, 'latest-results.json'), JSON.stringify(output, null, 2));
  const dateStr = new Date().toISOString().split('T')[0];
  fs.writeFileSync(path.join(historyDir, `${dateStr}.json`), JSON.stringify(output, null, 2));
  console.log(`\n✅ JSON results saved`);

  // === Save to SQLite ===
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
    INSERT INTO brand_results (run_id, industry_id, brand, category, score, recommendation, sentiment, prominence, accuracy, response_time_ms, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

      for (const brand of result.brandResults) {
        insertBrand.run(
          runId, result.industry.id, brand.brand, brand.category,
          brand.score, brand.breakdown.recommendation, brand.breakdown.sentiment,
          brand.breakdown.prominence, brand.breakdown.accuracy,
          brand.responseTime, brand.error || null
        );
      }
    }
  });

  saveAll();
  db.close();
  console.log(`💾 SQLite database saved to ${dbPath}`);

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
