/**
 * Shared SQLite database helper for API routes.
 * Opens the brand-intelligence.db in read-only mode for serving data.
 */
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = path.join(process.cwd(), 'data', 'brand-intelligence.db');

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database not found: ${dbPath}`);
  }

  _db = new Database(dbPath, { readonly: true, fileMustExist: true });
  _db.pragma('journal_mode = WAL');
  return _db;
}

// --- Query helpers ---

export interface BrandRow {
  id: number;
  run_id: number;
  industry_id: string;
  brand: string;
  category: string;
  score: number;
  recommendation: number;
  sentiment: number;
  prominence: number;
  accuracy: number;
  response_time_ms: number;
  error: string | null;
  model: string | null;
}

export interface RunRow {
  id: number;
  run_date: string;
  total_industries: number;
  total_brands: number;
  successful_brands: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  total_time_ms: number;
  created_at: string;
}

export interface IndustryRow {
  id: number;
  run_id: number;
  industry_id: string;
  industry_name: string;
  avg_score: number;
  avg_recommendation: number;
  avg_sentiment: number;
  avg_prominence: number;
  avg_accuracy: number;
  total_brands: number;
  successful_brands: number;
  response_time_ms: number;
  error: string | null;
}

/** Get the latest pipeline run, or a specific one by date */
export function getRun(date?: string): RunRow | undefined {
  const db = getDb();
  if (date) {
    return db.prepare('SELECT * FROM pipeline_runs WHERE run_date = ?').get(date) as RunRow | undefined;
  }
  return db.prepare('SELECT * FROM pipeline_runs ORDER BY id DESC LIMIT 1').get() as RunRow | undefined;
}

/** Get all run dates (chronological) */
export function getAllRunDates(): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT run_date FROM pipeline_runs ORDER BY run_date ASC').all() as { run_date: string }[];
  return rows.map(r => r.run_date);
}

/** Get brand results for a run + industry, optionally filtered by model */
export function getBrandResults(runId: number, industryId: string, model?: string): BrandRow[] {
  const db = getDb();
  if (model && model !== 'all') {
    return db.prepare(
      'SELECT * FROM brand_results WHERE run_id = ? AND industry_id = ? AND model = ? AND score > 0 ORDER BY score DESC'
    ).all(runId, industryId, model) as BrandRow[];
  }
  // "all" = aggregated rows (model IS NULL)
  return db.prepare(
    'SELECT * FROM brand_results WHERE run_id = ? AND industry_id = ? AND model IS NULL AND score > 0 ORDER BY score DESC'
  ).all(runId, industryId) as BrandRow[];
}

/** Get available models for a run + industry */
export function getAvailableModels(runId: number, industryId: string): string[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT DISTINCT model FROM brand_results WHERE run_id = ? AND industry_id = ? AND model IS NOT NULL ORDER BY model'
  ).all(runId, industryId) as { model: string }[];
  return rows.map(r => r.model);
}

/** Get industry result for a run */
export function getIndustryResult(runId: number, industryId: string): IndustryRow | undefined {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM industry_results WHERE run_id = ? AND industry_id = ?'
  ).get(runId, industryId) as IndustryRow | undefined;
}

/** Get all industry results for a run */
export function getAllIndustryResults(runId: number): IndustryRow[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM industry_results WHERE run_id = ?'
  ).all(runId) as IndustryRow[];
}

/**
 * Build timeline data for an industry across all runs.
 * Returns { dates: string[], brands: { [brandName]: { date, score, rank }[] } }
 */
export function getTimeline(industryId: string): { dates: string[]; brands: Record<string, { date: string; score: number; rank: number }[]> } {
  const db = getDb();

  // Get all runs
  const runs = db.prepare('SELECT id, run_date FROM pipeline_runs ORDER BY run_date ASC').all() as { id: number; run_date: string }[];

  const dates: string[] = [];
  const brands: Record<string, { date: string; score: number; rank: number }[]> = {};

  for (const run of runs) {
    // Get aggregated (model IS NULL) scores for this industry, ranked
    const results = db.prepare(
      'SELECT brand, score FROM brand_results WHERE run_id = ? AND industry_id = ? AND model IS NULL AND score > 0 ORDER BY score DESC'
    ).all(run.id, industryId) as { brand: string; score: number }[];

    if (results.length === 0) continue;

    dates.push(run.run_date);

    results.forEach((r, idx) => {
      if (!brands[r.brand]) brands[r.brand] = [];
      brands[r.brand].push({ date: run.run_date, score: r.score, rank: idx + 1 });
    });
  }

  return { dates, brands };
}
