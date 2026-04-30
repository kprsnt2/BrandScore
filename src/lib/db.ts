/**
 * Shared SQLite database helper for API routes.
 * Uses sql.js (pure WASM) for Vercel serverless compatibility.
 * Opens the brand-intelligence.db in read-only mode for serving data.
 */
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';

let _db: SqlJsDatabase | null = null;

export async function getDb(): Promise<SqlJsDatabase> {
  if (_db) return _db;

  const dbPath = path.join(process.cwd(), 'data', 'brand-intelligence.db');

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database not found: ${dbPath}`);
  }

  // Locate the WASM binary for sql.js
  const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);
  const SQL = await initSqlJs({ wasmBinary });

  const buffer = fs.readFileSync(dbPath);
  _db = new SQL.Database(buffer);
  return _db;
}

// --- Query helpers ---

// Helper to convert sql.js result rows to objects
function rowsToObjects<T>(result: initSqlJs.QueryExecResult[]): T[] {
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(vals => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => obj[c] = vals[i]);
    return obj as T;
  });
}

function rowToObject<T>(result: initSqlJs.QueryExecResult[]): T | undefined {
  const rows = rowsToObjects<T>(result);
  return rows.length > 0 ? rows[0] : undefined;
}

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
export async function getRun(date?: string): Promise<RunRow | undefined> {
  const db = await getDb();
  if (date) {
    return rowToObject<RunRow>(db.exec(`SELECT * FROM pipeline_runs WHERE run_date = '${date}'`));
  }
  return rowToObject<RunRow>(db.exec('SELECT * FROM pipeline_runs ORDER BY id DESC LIMIT 1'));
}

/** Get all run dates (chronological) */
export async function getAllRunDates(): Promise<string[]> {
  const db = await getDb();
  const rows = rowsToObjects<{ run_date: string }>(
    db.exec('SELECT run_date FROM pipeline_runs ORDER BY run_date ASC')
  );
  return rows.map(r => r.run_date);
}

/** Get brand results for a run + industry, optionally filtered by model */
export async function getBrandResults(runId: number, industryId: string, model?: string): Promise<BrandRow[]> {
  const db = await getDb();
  if (model && model !== 'all') {
    return rowsToObjects<BrandRow>(db.exec(
      `SELECT * FROM brand_results WHERE run_id = ${runId} AND industry_id = '${industryId}' AND model = '${model}' AND score > 0 ORDER BY score DESC`
    ));
  }
  // "all" = aggregated rows (model IS NULL)
  return rowsToObjects<BrandRow>(db.exec(
    `SELECT * FROM brand_results WHERE run_id = ${runId} AND industry_id = '${industryId}' AND model IS NULL AND score > 0 ORDER BY score DESC`
  ));
}

/** Get available models for a run + industry */
export async function getAvailableModels(runId: number, industryId: string): Promise<string[]> {
  const db = await getDb();
  const rows = rowsToObjects<{ model: string }>(db.exec(
    `SELECT DISTINCT model FROM brand_results WHERE run_id = ${runId} AND industry_id = '${industryId}' AND model IS NOT NULL ORDER BY model`
  ));
  return rows.map(r => r.model);
}

/** Get industry result for a run */
export async function getIndustryResult(runId: number, industryId: string): Promise<IndustryRow | undefined> {
  const db = await getDb();
  return rowToObject<IndustryRow>(db.exec(
    `SELECT * FROM industry_results WHERE run_id = ${runId} AND industry_id = '${industryId}'`
  ));
}

/** Get all industry results for a run */
export async function getAllIndustryResults(runId: number): Promise<IndustryRow[]> {
  const db = await getDb();
  return rowsToObjects<IndustryRow>(db.exec(
    `SELECT * FROM industry_results WHERE run_id = ${runId}`
  ));
}

/**
 * Build timeline data for an industry across all runs.
 * Returns { dates: string[], brands: { [brandName]: { date, score, rank }[] } }
 */
export async function getTimeline(industryId: string): Promise<{ dates: string[]; brands: Record<string, { date: string; score: number; rank: number }[]> }> {
  const db = await getDb();

  // Get all runs
  const runs = rowsToObjects<{ id: number; run_date: string }>(
    db.exec('SELECT id, run_date FROM pipeline_runs ORDER BY run_date ASC')
  );

  const dates: string[] = [];
  const brands: Record<string, { date: string; score: number; rank: number }[]> = {};

  for (const run of runs) {
    // Get aggregated (model IS NULL) scores for this industry, ranked
    const results = rowsToObjects<{ brand: string; score: number }>(db.exec(
      `SELECT brand, score FROM brand_results WHERE run_id = ${run.id} AND industry_id = '${industryId}' AND model IS NULL AND score > 0 ORDER BY score DESC`
    ));

    if (results.length === 0) continue;

    dates.push(run.run_date);

    results.forEach((r, idx) => {
      if (!brands[r.brand]) brands[r.brand] = [];
      brands[r.brand].push({ date: run.run_date, score: r.score, rank: idx + 1 });
    });
  }

  return { dates, brands };
}
