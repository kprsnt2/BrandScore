import { NextRequest, NextResponse } from "next/server";
import { queryGemini } from "@/lib/gemini";
import { queryGroq } from "@/lib/groq";
import { queryOpenRouter } from "@/lib/openrouter";
import { queryNvidia } from "@/lib/nvidia";
import { calculateLLMOScore, analyzeSentiment, countBrandMentions, generateTips } from "@/lib/scoring";
import { validateBrandInput } from "@/lib/validation";
import { getEnv, hasApiKeys } from "@/lib/env";

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
    // We need to re-set to update the LRU position, though technically modifying the object reference 
    // works for the data, LRU order isn't updated unless we 'get' or 'set' again.
    // However, our custom LRUCache 'get' moves it to the end, so we are good on order.
    // But we need to ensure the data is persisted if we fetched a copy. 
    // The current LRUCache returns the object reference, so modifying 'existing' works.

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
        if (!apiKeys.gemini && !apiKeys.groq && !apiKeys.openrouter && !apiKeys.nvidia) {
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
            modelType: "free" | "pro"; // Kept for type compatibility but will always be "free"
            error?: unknown;
        }>[] = [];

        // Helper function: Gemini with NVIDIA DeepSeek fallback
        const queryGeminiWithFallback = async () => {
            try {
                return await queryGemini(brand, category);
            } catch (geminiError) {
                console.warn("Gemini failed, falling back to NVIDIA DeepSeek:", geminiError);
                if (apiKeys.nvidia) {
                    try {
                        return await queryNvidia(brand, category, "deepseek-ai/deepseek-v3.2");
                    } catch (nvidiaError) {
                        console.error("NVIDIA DeepSeek fallback failed:", nvidiaError);
                        throw geminiError;
                    }
                }
                throw geminiError;
            }
        };

        // Helper function: Groq with NVIDIA Step-3.5 fallback
        const queryGroqWithFallback = async () => {
            try {
                return await queryGroq(brand, category);
            } catch (groqError) {
                console.warn("Groq failed, falling back to NVIDIA Step-3.5:", groqError);
                if (apiKeys.nvidia) {
                    try {
                        return await queryNvidia(brand, category, "stepfun-ai/step-3.5-flash");
                    } catch (nvidiaError) {
                        console.error("NVIDIA Step-3.5 fallback failed:", nvidiaError);
                        throw groqError;
                    }
                }
                throw groqError;
            }
        };

        // Helper function: OpenRouter with NVIDIA GLM-4.7 fallback
        const queryOpenRouterWithFallback = async () => {
            try {
                return await queryOpenRouter(brand, category);
            } catch (openRouterError) {
                console.warn("OpenRouter failed, falling back to NVIDIA GLM-4.7:", openRouterError);
                if (apiKeys.nvidia) {
                    try {
                        return await queryNvidia(brand, category, "z-ai/glm4.7");
                    } catch (nvidiaError) {
                        console.error("NVIDIA GLM-4.7 fallback failed:", nvidiaError);
                        throw openRouterError;
                    }
                }
                throw openRouterError;
            }
        };

        if (apiKeys.gemini) {
            modelQueries.push(
                queryGeminiWithFallback().catch(e => ({
                    text: "Unable to fetch response from Gemini",
                    model: "Gemini 2.5 Flash",
                    modelType: "free" as const,
                    error: e
                }))
            );
        } else if (apiKeys.nvidia) {
            // If Gemini not available but NVIDIA is, use NVIDIA DeepSeek directly as primary
            modelQueries.push(
                queryNvidia(brand, category, "deepseek-ai/deepseek-v3.2").catch(e => ({
                    text: "Unable to fetch response from NVIDIA DeepSeek",
                    model: "DeepSeek V3.2 (NVIDIA)",
                    modelType: "free" as const,
                    error: e
                }))
            );
        }

        if (apiKeys.groq) {
            modelQueries.push(
                queryGroqWithFallback().catch(e => ({
                    text: "Unable to fetch response from Groq",
                    model: "Llama 3.3 70B (Groq)",
                    modelType: "free" as const,
                    error: e
                }))
            );
        }

        if (apiKeys.openrouter) {
            modelQueries.push(
                queryOpenRouterWithFallback().catch(e => ({
                    text: "Unable to fetch response from OpenRouter",
                    model: "LFM 40B (OpenRouter)",
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

        // Process responses
        const responses = validResults.map(result => ({
            model: result.model,
            modelType: result.modelType,
            text: result.text,
            sentiment: analyzeSentiment(result.text),
            mentionsCount: countBrandMentions(result.text, brand),
        }));

        // Calculate LLMO score
        const scoringInputs = responses.map(r => ({ text: r.text, brand }));
        const { score, breakdown } = calculateLLMOScore(scoringInputs);

        // Generate tips
        const tips = generateTips(score, breakdown, brand);

        const responseTime = Date.now() - startTime;

        // Add rate limit headers
        const response = NextResponse.json({
            brand,
            category,
            score,
            responses,
            breakdown,
            tips,
            meta: {
                responseTime,
                modelsQueried: validResults.length,
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

