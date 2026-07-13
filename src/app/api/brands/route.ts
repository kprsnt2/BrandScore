/**
 * GET /api/brands?industry=technology&model=all
 *
 * Returns ranked brands for a given industry from the SQLite database.
 * Supports model filtering and previous-day comparison data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBrandResults, getAvailableModels, type BrandRow } from '@/lib/db';
import { INDUSTRIES } from '@/lib/industry-data';

export const revalidate = 3600;

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function rowsToObjects<T>(result: { columns: string[]; values: unknown[][] }[]): T[] {
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(vals => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => { obj[c] = vals[i]; });
    return obj as T;
  });
}

interface RunDateRow {
  run_date: string;
  timestamp: string;
  run_id: number;
}

async function getLatestIndustryRunDate(db: Awaited<ReturnType<typeof import('@/lib/db').getDb>>, industryId: string): Promise<RunDateRow | null> {
  const rows = rowsToObjects<RunDateRow>(db.exec(`
    SELECT pr.run_date, MAX(pr.created_at) AS timestamp, MAX(pr.id) AS run_id
    FROM pipeline_runs pr
    JOIN brand_results br ON br.run_id = pr.id
    WHERE br.industry_id = '${industryId}' AND br.score > 0
    GROUP BY pr.run_date
    ORDER BY pr.run_date DESC
    LIMIT 1
  `));
  return rows[0] || null;
}

async function getPreviousIndustryRunDate(db: Awaited<ReturnType<typeof import('@/lib/db').getDb>>, industryId: string, currentDate: string): Promise<RunDateRow | null> {
  const rows = rowsToObjects<RunDateRow>(db.exec(`
    SELECT pr.run_date, MAX(pr.created_at) AS timestamp, MAX(pr.id) AS run_id
    FROM pipeline_runs pr
    JOIN brand_results br ON br.run_id = pr.id
    WHERE br.industry_id = '${industryId}' AND br.score > 0 AND pr.run_date < '${currentDate}'
    GROUP BY pr.run_date
    ORDER BY pr.run_date DESC
    LIMIT 1
  `));
  return rows[0] || null;
}

async function getAllModelAverageBrandResults(db: Awaited<ReturnType<typeof import('@/lib/db').getDb>>, industryId: string, runDate: string): Promise<BrandRow[]> {
  const modelRows = rowsToObjects<{
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
    model: null;
    model_count: number;
  } & BrandRow>(db.exec(`
    SELECT
      MIN(br.id) AS id,
      MAX(br.run_id) AS run_id,
      br.industry_id,
      br.brand,
      MIN(br.category) AS category,
      ROUND(AVG(br.score)) AS score,
      AVG(br.recommendation) AS recommendation,
      AVG(br.sentiment) AS sentiment,
      AVG(br.prominence) AS prominence,
      AVG(br.accuracy) AS accuracy,
      AVG(br.response_time_ms) AS response_time_ms,
      NULL AS error,
      NULL AS model,
      COUNT(DISTINCT br.model) AS model_count
    FROM brand_results br
    JOIN pipeline_runs pr ON pr.id = br.run_id
    WHERE pr.run_date = '${runDate}'
      AND br.industry_id = '${industryId}'
      AND br.model IS NOT NULL
      AND br.score > 0
    GROUP BY br.industry_id, br.brand
    ORDER BY AVG(br.score) DESC, br.brand ASC
  `));

  if (modelRows.length > 0) return modelRows;

  return rowsToObjects<BrandRow>(db.exec(`
    SELECT br.*
    FROM brand_results br
    JOIN pipeline_runs pr ON pr.id = br.run_id
    WHERE pr.run_date = '${runDate}'
      AND br.industry_id = '${industryId}'
      AND br.model IS NULL
      AND br.score > 0
    ORDER BY br.score DESC, br.brand ASC
  `));
}

function averageMetric<T extends { score: number; recommendation: number; sentiment: number; prominence: number; accuracy: number }>(rows: T[], key: keyof T): number {
  if (rows.length === 0) return 0;
  const total = rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  return Math.round((total / rows.length) * 10) / 10;
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industry') || 'technology';
    const model = searchParams.get('model') || 'all';
    const topN = searchParams.get('top') ? parseInt(searchParams.get('top')!, 10) : null;

    // Validate industry
    const industryMeta = INDUSTRIES.find(i => i.id === industryId);
    if (!industryMeta) {
      return NextResponse.json({ error: 'Invalid industry' }, { status: 400 });
    }

    const safeIndustryId = sqlEscape(industryId);

    // Get the latest date that has data for this industry. Multiple model runs can
    // happen on the same date, so the dashboard's "All Models" view must aggregate
    // across every model run for this latest date rather than using only the latest
    // run_id.
    const db = await import('@/lib/db').then(m => m.getDb());
    const latestRun = await getLatestIndustryRunDate(db, safeIndustryId);
    if (!latestRun) {
      return NextResponse.json({ error: 'No pipeline data available for this industry' }, { status: 404 });
    }

    const currentRunId = latestRun.run_id;
    const brands = model === 'all'
      ? await getAllModelAverageBrandResults(db, safeIndustryId, latestRun.run_date)
      : await getBrandResults(currentRunId, safeIndustryId, model);
    const availableModels = await getAvailableModels(currentRunId, safeIndustryId);

    // Get previous date for change calculations. For All Models, compare against
    // the previous date's all-model average. For a specific model, keep the model
    // filter and search across all runs on that previous date.
    let prevBrands: typeof brands = [];
    const previousRun = await getPreviousIndustryRunDate(db, safeIndustryId, latestRun.run_date);
    if (previousRun) {
      prevBrands = model === 'all'
        ? await getAllModelAverageBrandResults(db, safeIndustryId, previousRun.run_date)
        : await getBrandResults(previousRun.run_id, safeIndustryId, model);
    }

    // Build prev lookup
    const prevMap: Record<string, { score: number; rank: number }> = {};
    prevBrands.forEach((b, i) => {
      prevMap[b.brand] = { score: b.score, rank: i + 1 };
    });

    // Format response
    const rankedBrands = brands.map((b, index) => {
      const prev = prevMap[b.brand];
      return {
        brand: b.brand,
        score: b.score,
        breakdown: {
          recommendation: b.recommendation,
          sentiment: b.sentiment,
          prominence: b.prominence,
          accuracy: b.accuracy,
        },
        rank: index + 1,
        scoreChange: prev ? b.score - prev.score : null,
        rankChange: prev ? prev.rank - (index + 1) : null,
      };
    });

    return NextResponse.json({
      industry: {
        id: industryId,
        name: industryMeta.name,
        category: industryMeta.category,
      },
      brands: topN ? rankedBrands.slice(0, topN) : rankedBrands,
      industryAverage: {
        score: averageMetric(brands, 'score'),
        recommendation: averageMetric(brands, 'recommendation'),
        sentiment: averageMetric(brands, 'sentiment'),
        prominence: averageMetric(brands, 'prominence'),
        accuracy: averageMetric(brands, 'accuracy'),
      },
      availableModels,
      selectedModel: model,
      totalBrands: rankedBrands.length,
      runDate: latestRun.run_date,
      timestamp: latestRun.timestamp,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error in /api/brands:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
