/**
 * GET /api/brands?industry=technology&model=all
 *
 * Returns ranked brands for a given industry from the SQLite database.
 * Supports model filtering and previous-day comparison data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getRun, getBrandResults, getAvailableModels, getIndustryResult, getAllRunDates } from '@/lib/db';
import { INDUSTRIES } from '@/lib/industry-data';

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industry') || 'technology';
    const model = searchParams.get('model') || 'all';

    // Validate industry
    const industryMeta = INDUSTRIES.find(i => i.id === industryId);
    if (!industryMeta) {
      return NextResponse.json({ error: 'Invalid industry' }, { status: 400 });
    }

    // Get latest run
    const latestRun = await getRun();
    if (!latestRun) {
      return NextResponse.json({ error: 'No pipeline data available' }, { status: 404 });
    }

    // Get brand results
    const db = await import('@/lib/db').then(m => m.getDb());
    
    // Find all runs that have data for this industry, ordered by newest first
    const industryRunsQuery = db.exec(`
      SELECT DISTINCT run_id 
      FROM brand_results 
      WHERE industry_id = '${industryId}' 
      ORDER BY run_id DESC
    `);

    if (industryRunsQuery.length === 0 || industryRunsQuery[0].values.length === 0) {
      return NextResponse.json({ error: 'No pipeline data available for this industry' }, { status: 404 });
    }

    const currentRunId = industryRunsQuery[0].values[0][0] as number;
    const brands = await getBrandResults(currentRunId, industryId, model);
    const availableModels = await getAvailableModels(currentRunId, industryId);
    const industryResult = await getIndustryResult(currentRunId, industryId);

    // Get previous run for change calculations
    let prevBrands: typeof brands = [];
    if (industryRunsQuery[0].values.length > 1) {
      const prevRunId = industryRunsQuery[0].values[1][0] as number;
      prevBrands = await getBrandResults(prevRunId, industryId, model);
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
      brands: rankedBrands,
      industryAverage: {
        score: industryResult?.avg_score || 0,
        recommendation: industryResult?.avg_recommendation || 0,
        sentiment: industryResult?.avg_sentiment || 0,
        prominence: industryResult?.avg_prominence || 0,
        accuracy: industryResult?.avg_accuracy || 0,
      },
      availableModels,
      selectedModel: model,
      totalBrands: rankedBrands.length,
      runDate: latestRun.run_date,
      timestamp: latestRun.created_at,
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
