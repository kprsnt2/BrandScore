import { Industry, getIndustryById, getAllIndustries } from './industry-data';
import { queryGemini } from './gemini';
import { queryGroq } from './groq';
import { queryNvidia } from './nvidia';
import { generateBatchIndustryPrompt, parseBatchIndustryResponse, BatchBrandScore } from './prompts';
import { hasApiKeys } from './env';

export interface BrandAnalysisResult {
  brand: string;
  industry: string;
  category: string;
  score: number;
  breakdown: {
    recommendation: number;
    sentiment: number;
    prominence: number;
    accuracy: number;
  };
  responses: Array<{
    model: string;
    modelType: "free" | "pro";
    text: string;
    sentiment: "positive" | "neutral" | "negative";
    mentionsCount: number;
  }>;
  responseTime: number;
  timestamp: string;
  error?: string;
}

export interface IndustryAnalysisResult {
  industry: Industry;
  brandResults: BrandAnalysisResult[];
  industryAverage: {
    score: number;
    recommendation: number;
    sentiment: number;
    prominence: number;
    accuracy: number;
  };
  topPerformers: BrandAnalysisResult[];
  bottomPerformers: BrandAnalysisResult[];
  totalResponseTime: number;
  timestamp: string;
  error?: string;
}

export interface PipelineConfig {
  delayBetweenIndustries: number;
  timeoutMs: number;
}

export class BrandAnalysisPipeline {
  private config: PipelineConfig;
  private apiKeys: ReturnType<typeof hasApiKeys>;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = {
      delayBetweenIndustries: 5000,
      timeoutMs: 120000,
      ...config
    };
    this.apiKeys = hasApiKeys();
  }

  async analyzeIndustry(industryId: string): Promise<IndustryAnalysisResult> {
    const industry = getIndustryById(industryId);
    if (!industry) {
      throw new Error(`Industry not found: ${industryId}`);
    }

    console.log(`  📋 ${industry.name} (${industry.topBrands.length} brands)...`);
    const startTime = Date.now();

    try {
      // Single batch prompt for all brands in this industry
      const prompt = generateBatchIndustryPrompt(industry.topBrands, industry.category);
      const modelResults = await this.queryAllModels(prompt);

      // Aggregate scores across models
      const brandResults = this.aggregateBatchResults(modelResults, industry);
      const industryAverage = this.calculateIndustryAverage(brandResults);
      const topPerformers = this.getTopPerformers(brandResults, 5);
      const bottomPerformers = this.getBottomPerformers(brandResults, 3);
      const totalResponseTime = Date.now() - startTime;

      const successCount = brandResults.filter(b => !b.error).length;
      console.log(`  ✅ ${industry.name}: ${successCount}/${industry.topBrands.length} brands scored in ${Math.round(totalResponseTime / 1000)}s`);

      return {
        industry,
        brandResults,
        industryAverage,
        topPerformers,
        bottomPerformers,
        totalResponseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`  ❌ ${industry.name} failed:`, error instanceof Error ? error.message : error);
      return {
        industry,
        brandResults: [],
        industryAverage: { score: 0, recommendation: 0, sentiment: 0, prominence: 0, accuracy: 0 },
        topPerformers: [],
        bottomPerformers: [],
        totalResponseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async analyzeAllIndustries(): Promise<IndustryAnalysisResult[]> {
    const industries = getAllIndustries();
    console.log(`Starting pipeline: ${industries.length} industries (1 request per industry per model)\n`);
    
    const results: IndustryAnalysisResult[] = [];
    
    for (let i = 0; i < industries.length; i++) {
      const industry = industries[i];
      try {
        const result = await this.analyzeIndustry(industry.id);
        results.push(result);
        
        // Delay between industries to respect rate limits
        if (i < industries.length - 1 && this.config.delayBetweenIndustries > 0) {
          await this.delay(this.config.delayBetweenIndustries);
        }
      } catch (error) {
        console.error(`Failed to analyze industry ${industry.name}:`, error);
      }
    }
    
    return results;
  }

  private async queryAllModels(prompt: string): Promise<{ model: string; scores: BatchBrandScore[] }[]> {
    const perModelTimeout = this.config.timeoutMs; // timeout per model, not global

    // Helper: wrap a query with its own timeout
    const withTimeout = <T>(promise: Promise<T>, model: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${model} timed out after ${perModelTimeout / 1000}s`)), perModelTimeout)
        ),
      ]);
    };

    const queries: Promise<{ model: string; text: string; error?: unknown }>[] = [];

    if (this.apiKeys.gemini) {
      queries.push(
        withTimeout(this.queryGeminiRaw(prompt), 'Gemini').catch(e => ({
          text: '', model: 'Gemini 2.5 Flash', error: e
        }))
      );
    }

    if (this.apiKeys.groq) {
      queries.push(
        withTimeout(this.queryGroqRaw(prompt), 'Groq').catch(e => ({
          text: '', model: 'Llama 3.3 70B (Groq)', error: e
        }))
      );
    }

    if (this.apiKeys.nvidia) {
      queries.push(
        withTimeout(this.queryNvidiaRaw(prompt), 'NVIDIA').catch(e => ({
          text: '', model: 'DeepSeek V4 Pro (NVIDIA)', error: e
        }))
      );
    }

    // allSettled: each model resolves independently, no global timeout
    const settled = await Promise.allSettled(queries);
    const results = settled
      .filter((s): s is PromiseFulfilledResult<{ model: string; text: string; error?: unknown }> => s.status === 'fulfilled')
      .map(s => s.value);

    // Parse each model's batch response
    const parsed: { model: string; scores: BatchBrandScore[] }[] = [];
    for (const result of results) {
      if (result.error || !result.text) {
        console.warn(`    ⚠ ${result.model} failed: ${result.error instanceof Error ? result.error.message : 'unknown'}`);
        continue;
      }
      const scores = parseBatchIndustryResponse(result.text);
      if (scores.length > 0) {
        console.log(`    ✓ ${result.model}: ${scores.length} brands parsed`);
        parsed.push({ model: result.model, scores });
      } else {
        console.warn(`    ⚠ ${result.model}: could not parse response`);
      }
    }

    if (parsed.length === 0) {
      throw new Error("All AI providers failed for this industry");
    }

    return parsed;
  }

  private aggregateBatchResults(
    modelResults: { model: string; scores: BatchBrandScore[] }[],
    industry: Industry
  ): BrandAnalysisResult[] {
    // Build a map: brand name -> scores from each model
    const brandMap = new Map<string, { scores: BatchBrandScore[]; models: string[] }>();

    for (const { model, scores } of modelResults) {
      for (const score of scores) {
        // Fuzzy match brand name (case-insensitive, trim)
        const key = score.brand.trim().toLowerCase();
        if (!brandMap.has(key)) {
          brandMap.set(key, { scores: [], models: [] });
        }
        brandMap.get(key)!.scores.push(score);
        brandMap.get(key)!.models.push(model);
      }
    }

    // Create results for each brand in the industry
    return industry.topBrands.map(brandName => {
      const key = brandName.trim().toLowerCase();
      const data = brandMap.get(key);

      if (!data || data.scores.length === 0) {
        return {
          brand: brandName,
          industry: industry.id,
          category: industry.category,
          score: 0,
          breakdown: { recommendation: 0, sentiment: 0, prominence: 0, accuracy: 0 },
          responses: [],
          responseTime: 0,
          timestamp: new Date().toISOString(),
          error: 'No model returned data for this brand'
        };
      }

      // Average scores across models
      const count = data.scores.length;
      const avgBreakdown = {
        recommendation: Math.round(data.scores.reduce((s, d) => s + d.breakdown.recommendation, 0) / count),
        sentiment: Math.round(data.scores.reduce((s, d) => s + d.breakdown.sentiment, 0) / count),
        prominence: Math.round(data.scores.reduce((s, d) => s + d.breakdown.prominence, 0) / count),
        accuracy: Math.round(data.scores.reduce((s, d) => s + d.breakdown.accuracy, 0) / count),
      };
      const avgScore = avgBreakdown.recommendation + avgBreakdown.sentiment + avgBreakdown.prominence + avgBreakdown.accuracy;

      return {
        brand: brandName,
        industry: industry.id,
        category: industry.category,
        score: Math.min(100, avgScore),
        breakdown: avgBreakdown,
        responses: data.models.map(m => ({
          model: m,
          modelType: "free" as const,
          text: '',
          sentiment: "neutral" as const,
          mentionsCount: 0,
        })),
        responseTime: 0,
        timestamp: new Date().toISOString()
      };
    });
  }

  // Direct model queries that send raw prompts (not the structured brand prompt)
  private async queryGeminiRaw(prompt: string) {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const env = (await import('./env')).getEnv();
    const apiKey = env.GEMINI_API_KEY || env.GEMINI_API_KEY_PAID;
    if (!apiKey) throw new Error("No Gemini API key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_API_KEY_PAID ? "gemini-pro-latest" : "gemini-2.5-flash",
      generationConfig: { maxOutputTokens: 8000, temperature: 0.3 },
    });

    const result = await model.generateContent(prompt);
    return { text: result.response.text(), model: "Gemini 2.5 Flash" };
  }

  private async queryGroqRaw(prompt: string) {
    const env = (await import('./env')).getEnv();
    if (!env.GROQ_API_KEY) throw new Error("No Groq API key");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
    const data = await response.json();
    return { text: data.choices[0]?.message?.content || '', model: "Llama 3.3 70B (Groq)" };
  }

  private async queryNvidiaRaw(prompt: string) {
    const env = (await import('./env')).getEnv();
    if (!env.NVIDIA_API_KEY) throw new Error("No NVIDIA API key");

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-ai/deepseek-v4-pro",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error(`NVIDIA API error: ${response.status}`);
    const data = await response.json();
    return { text: data.choices[0]?.message?.content || '', model: "DeepSeek V4 Pro (NVIDIA)" };
  }

  private calculateIndustryAverage(results: BrandAnalysisResult[]) {
    const validResults = results.filter(r => !r.error);
    
    if (validResults.length === 0) {
      return { score: 0, recommendation: 0, sentiment: 0, prominence: 0, accuracy: 0 };
    }

    const totals = validResults.reduce((acc, result) => ({
      score: acc.score + result.score,
      recommendation: acc.recommendation + result.breakdown.recommendation,
      sentiment: acc.sentiment + result.breakdown.sentiment,
      prominence: acc.prominence + result.breakdown.prominence,
      accuracy: acc.accuracy + result.breakdown.accuracy
    }), { score: 0, recommendation: 0, sentiment: 0, prominence: 0, accuracy: 0 });

    const count = validResults.length;
    return {
      score: Math.round(totals.score / count),
      recommendation: Math.round(totals.recommendation / count),
      sentiment: Math.round(totals.sentiment / count),
      prominence: Math.round(totals.prominence / count),
      accuracy: Math.round(totals.accuracy / count)
    };
  }

  private getTopPerformers(results: BrandAnalysisResult[], count: number): BrandAnalysisResult[] {
    return results
      .filter(r => !r.error)
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }

  private getBottomPerformers(results: BrandAnalysisResult[], count: number): BrandAnalysisResult[] {
    return results
      .filter(r => !r.error)
      .sort((a, b) => a.score - b.score)
      .slice(0, count);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
