import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateInsight } from '@/lib/insights';

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get('brand');
    const industry = searchParams.get('industry');

    if (!brand || !industry) {
      return NextResponse.json({ error: 'Missing brand or industry parameter' }, { status: 400 });
    }

    const db = await getDb();
    
    // Fetch latest metrics for this brand
    const safeBrand = brand.replace(/'/g, "''");
    
    const result = db.exec(`
      SELECT score, recommendation, sentiment
      FROM brand_results
      WHERE brand = '${safeBrand}' AND model IS NULL
      ORDER BY run_id DESC
      LIMIT 1
    `);

    if (result.length === 0 || result[0].values.length === 0) {
      return NextResponse.json({ error: 'Brand data not found' }, { status: 404 });
    }

    const row = result[0].values[0];
    const score = row[0] as number;
    const recommendation = row[1] as number;
    const sentiment = row[2] as number;

    const prompt = `You are the "rAsh Engine", an elite SEO and LLMO (Large Language Model Optimization) strategist.
Your client is the brand "${brand}" in the "${industry}" industry.

Their current AI Visibility Metrics:
- Overall Score: ${score}/100
- Recommendation Rate: ${recommendation}%
- Sentiment Score: ${sentiment}%

Write a highly actionable, 3-step action plan on how this brand can manipulate or improve its visibility in Large Language Models.
If sentiment is low, suggest reputation management. If recommendation is low, suggest product comparisons. If everything is high, suggest defensive moat strategies.

Output ONLY the action plan formatted in clean Markdown. Start directly with the first step (e.g., "### Step 1: ..."). Use bold text for emphasis. Do not include introductory text.`;

    const { text, generatedBy } = await generateInsight(prompt);

    return NextResponse.json({
      plan: text,
      metrics: { score, recommendation, sentiment },
      generatedBy,
    });
  } catch (error) {
    console.error('rAsh Engine API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
