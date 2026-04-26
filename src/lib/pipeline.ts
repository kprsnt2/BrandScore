import { Industry, getIndustryById, getAllIndustries } from './industry-data';
import { queryGemini } from './gemini';
import { queryGroq } from './groq';
import { queryNvidia } from './nvidia';
import { calculateLLMOScore, analyzeSentiment, countBrandMentions } from './scoring';
import { getEnv, hasApiKeys } from './env';

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
  maxConcurrentBrands: number;
  delayBetweenRequests: number;
  timeoutMs: number;
  retryAttempts: number;
}

export class BrandAnalysisPipeline {
  private config: PipelineConfig;
  private apiKeys: ReturnType<typeof hasApiKeys>;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = {
      maxConcurrentBrands: 3,
      delayBetweenRequests: 1000,
      timeoutMs: 60000,
      retryAttempts: 2,
      ...config
    };
    this.apiKeys = hasApiKeys();
  }

  async analyzeIndustry(industryId: string): Promise<IndustryAnalysisResult> {
    const industry = getIndustryById(industryId);
    if (!industry) {
      throw new Error(`Industry not found: ${industryId}`);
    }

    console.log(`Starting analysis for industry: ${industry.name}`);
    const startTime = Date.now();

    try {
      const brandResults = await this.analyzeBrandsInBatches(industry.topBrands, industry.category);
      
      const industryAverage = this.calculateIndustryAverage(brandResults);
      const topPerformers = this.getTopPerformers(brandResults, 5);
      const bottomPerformers = this.getBottomPerformers(brandResults, 3);

      const totalResponseTime = Date.now() - startTime;

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
      console.error(`Error analyzing industry ${industry.name}:`, error);
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
    console.log(`Starting pipeline analysis for ${industries.length} industries`);
    
    const results: IndustryAnalysisResult[] = [];
    
    for (const industry of industries) {
      try {
        const result = await this.analyzeIndustry(industry.id);
        results.push(result);
        
        // Add delay between industries to avoid rate limits
        if (this.config.delayBetweenRequests > 0) {
          await this.delay(this.config.delayBetweenRequests);
        }
      } catch (error) {
        console.error(`Failed to analyze industry ${industry.name}:`, error);
        // Continue with other industries even if one fails
      }
    }
    
    return results;
  }

  private async analyzeBrandsInBatches(brands: string[], category: string): Promise<BrandAnalysisResult[]> {
    const results: BrandAnalysisResult[] = [];
    
    for (let i = 0; i < brands.length; i += this.config.maxConcurrentBrands) {
      const batch = brands.slice(i, i + this.config.maxConcurrentBrands);
      
      const batchPromises = batch.map(brand => 
        this.analyzeSingleBrand(brand, category)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Failed to analyze brand ${batch[index]}:`, result.reason);
          results.push({
            brand: batch[index],
            industry: '',
            category,
            score: 0,
            breakdown: { recommendation: 0, sentiment: 0, prominence: 0, accuracy: 0 },
            responses: [],
            responseTime: 0,
            timestamp: new Date().toISOString(),
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
          });
        }
      });
      
      // Add delay between batches
      if (i + this.config.maxConcurrentBrands < brands.length && this.config.delayBetweenRequests > 0) {
        await this.delay(this.config.delayBetweenRequests);
      }
    }
    
    return results;
  }

  private async analyzeSingleBrand(brand: string, category: string): Promise<BrandAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const modelQueries = this.buildModelQueries(brand, category);
      
      const results = await Promise.race([
        Promise.all(modelQueries),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), this.config.timeoutMs)
        ),
      ]);

      const validResults = results.filter(r => !r.error || r.text.length > 0);

      if (validResults.length === 0) {
        throw new Error("All AI providers failed to respond");
      }

      const responses = validResults.map(result => ({
        model: result.model,
        modelType: result.modelType,
        text: result.text,
        sentiment: analyzeSentiment(result.text),
        mentionsCount: countBrandMentions(result.text, brand),
      }));

      const scoringInputs = responses.map(r => ({ text: r.text, brand }));
      const { score, breakdown } = calculateLLMOScore(scoringInputs);

      const responseTime = Date.now() - startTime;

      return {
        brand,
        industry: '',
        category,
        score,
        breakdown,
        responses,
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw error;
    }
  }

  private buildModelQueries(brand: string, category: string) {
    const queries: Promise<{
      text: string;
      model: string;
      modelType: "free" | "pro";
      error?: unknown;
    }>[] = [];

    if (this.apiKeys.gemini) {
      queries.push(
        queryGemini(brand, category).catch(e => ({
          text: "Unable to fetch response from Gemini",
          model: "Gemini 2.5 Flash",
          modelType: "free" as const,
          error: e
        }))
      );
    }

    if (this.apiKeys.groq) {
      queries.push(
        queryGroq(brand, category).catch(e => ({
          text: "Unable to fetch response from Groq",
          model: "Llama 3.3 70B (Groq)",
          modelType: "free" as const,
          error: e
        }))
      );
    }

    if (this.apiKeys.nvidia) {
      queries.push(
        queryNvidia(brand, category, "deepseek-ai/deepseek-v4-pro").catch(e => ({
          text: "Unable to fetch response from NVIDIA DeepSeek",
          model: "DeepSeek V4 Pro (NVIDIA)",
          modelType: "free" as const,
          error: e
        }))
      );
    }

    return queries;
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
