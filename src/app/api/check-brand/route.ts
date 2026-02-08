import { NextRequest, NextResponse } from "next/server";
import { queryGemini } from "@/lib/gemini";
import { queryGroq } from "@/lib/groq";
import { queryOpenRouter } from "@/lib/openrouter";
import { calculateLLMOScore, analyzeSentiment, countBrandMentions, generateTips, aggregateStructuredScores, Breakdown } from "@/lib/scoring";
import { validateBrandInput } from "@/lib/validation";
import { getEnv, hasApiKeys } from "@/lib/env";
import { AIScoreResponse } from "@/lib/prompts";

// Simple in-memory rate limiter
import { LRUCache } from "@/lib/cache";

// LRU Cache for rate limiting (max 1000 IPs tracked)
const rateLimiter = new LRUCache<{ count: number; resetTime: number }>(1000);

function getRateLimitKey(request: NextRequest): string {
    // Use IP address or forwarded header
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";
    return ip.trim();
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
    const env = getEnv();
    const now = Date.now();
    const windowMs = env.RATE_LIMIT_WINDOW_MS;
    const maxRequests = env.RATE_LIMIT_REQUESTS;

    const existing = rateLimiter.get(key);

    if (!existing || now > existing.resetTime) {
        rateLimiter.set(key, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
    }

    if (existing.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetIn: existing.resetTime - now };
    }

    // Update count
    existing.count++;

    return { allowed: true, remaining: maxRequests - existing.count, resetIn: existing.resetTime - now };
}

// Error response helper
function errorResponse(message: string, status: number, code?: string) {
    return NextResponse.json(
        { error: message, code: code || "ERROR" },
        { status }
    );
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Rate limiting
        const rateLimitKey = getRateLimitKey(request);
        const rateLimit = checkRateLimit(rateLimitKey);

        if (!rateLimit.allowed) {
            return errorResponse(
                `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
                429,
                "RATE_LIMIT_EXCEEDED"
            );
        }

        // Parse request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return errorResponse("Invalid JSON in request body", 400, "INVALID_JSON");
        }

        // Validate input
        const validation = validateBrandInput(body);
        if (!validation.success) {
            return errorResponse(validation.error, 400, "VALIDATION_ERROR");
        }

        const { brand, category } = validation.data;

        // Check API key availability
        const apiKeys = hasApiKeys();
        if (!apiKeys.gemini && !apiKeys.groq && !apiKeys.openrouter) {
            return errorResponse(
                "No AI providers configured. Please set API keys.",
                503,
                "NO_API_KEYS"
            );
        }

        // Query models based on available API keys
        const modelQueries: Promise<{
            text: string;
            model: string;
            modelType: "free" | "pro";
            structured?: AIScoreResponse;
            error?: unknown;
        }>[] = [];

        if (apiKeys.gemini) {
            modelQueries.push(
                queryGemini(brand, category).catch(e => ({
                    text: "Unable to fetch response from Gemini",
                    model: "Gemini 2.5 Flash",
                    modelType: "free" as const,
                    error: e
                }))
            );
        }

        if (apiKeys.groq) {
            modelQueries.push(
                queryGroq(brand, category).catch(e => ({
                    text: "Unable to fetch response from Groq",
                    model: "Llama 3.3 70B (Groq)",
                    modelType: "free" as const,
                    error: e
                }))
            );
        }

        if (apiKeys.openrouter) {
            modelQueries.push(
                queryOpenRouter(brand, category).catch(e => ({
                    text: "Unable to fetch response from OpenRouter",
                    model: "OpenRouter (Free)",
                    modelType: "free" as const,
                    error: e
                }))
            );
        }

        // Execute with timeout
        const timeoutMs = 45000; // Increased timeout for 3 models
        const results = await Promise.race([
            Promise.all(modelQueries),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Request timeout")), timeoutMs)
            ),
        ]);

        // Filter out complete failures
        const validResults = results.filter(r => !r.error || r.text.length > 0);

        if (validResults.length === 0) {
            return errorResponse(
                "All AI providers failed to respond. Please try again.",
                502,
                "ALL_PROVIDERS_FAILED"
            );
        }

        // Collect structured responses for aggregation
        const structuredResponses: AIScoreResponse[] = validResults
            .filter(r => r.structured)
            .map(r => r.structured as AIScoreResponse);

        let score: number;
        let breakdown: Breakdown;
        let tips: string[];
        let overallSentiment: "positive" | "neutral" | "negative";

        // Use structured scoring if we have at least one structured response
        if (structuredResponses.length > 0) {
            const aggregated = aggregateStructuredScores(structuredResponses);
            score = aggregated.score;
            breakdown = aggregated.breakdown;
            tips = aggregated.tips;
            overallSentiment = aggregated.overallSentiment;
        } else {
            // FALLBACK: Use keyword-based scoring
            const scoringInputs = validResults.map(r => ({ text: r.text, brand }));
            const calculated = calculateLLMOScore(scoringInputs);
            score = calculated.score;
            breakdown = calculated.breakdown;
            tips = generateTips(score, breakdown, brand);
            // Use first valid response for sentiment
            overallSentiment = validResults.length > 0
                ? analyzeSentiment(validResults[0].text)
                : "neutral";
        }

        // Process responses for display (include analysis from structured data if available)
        const responses = validResults.map(result => {
            if (result.structured) {
                return {
                    model: result.model,
                    modelType: result.modelType,
                    text: result.structured.analysis.description,
                    sentiment: result.structured.overallSentiment,
                    mentionsCount: countBrandMentions(result.text, brand),
                    analysis: result.structured.analysis,
                    scores: result.structured.scores,
                };
            }
            // Fallback for non-structured responses
            return {
                model: result.model,
                modelType: result.modelType,
                text: result.text,
                sentiment: analyzeSentiment(result.text),
                mentionsCount: countBrandMentions(result.text, brand),
            };
        });

        const responseTime = Date.now() - startTime;

        // Add rate limit headers
        const response = NextResponse.json({
            brand,
            category,
            score,
            responses,
            breakdown,
            tips,
            overallSentiment,
            meta: {
                responseTime,
                modelsQueried: validResults.length,
                structuredResponses: structuredResponses.length,
                timestamp: new Date().toISOString(),
            },
        });

        response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
        response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetIn / 1000)));

        return response;
    } catch (error) {
        console.error("Error in check-brand API:", error);

        if (error instanceof Error && error.message === "Request timeout") {
            return errorResponse("Request timed out. Please try again.", 504, "TIMEOUT");
        }

        return errorResponse(
            "An unexpected error occurred. Please try again.",
            500,
            "INTERNAL_ERROR"
        );
    }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
