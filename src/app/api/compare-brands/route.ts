import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { generateComparisonPrompt, parseComparisonResponse, ComparisonResponse } from "@/lib/prompts";
import { getEnv, hasApiKeys } from "@/lib/env";
import { LRUCache } from "@/lib/cache";
import { z } from "zod";

// Rate limiter
const rateLimiter = new LRUCache<{ count: number; resetTime: number }>(1000);

function getRateLimitKey(request: NextRequest): string {
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

    existing.count++;
    return { allowed: true, remaining: maxRequests - existing.count, resetIn: existing.resetTime - now };
}

function errorResponse(message: string, status: number, code?: string) {
    return NextResponse.json(
        { error: message, code: code || "ERROR" },
        { status }
    );
}

// Input validation schema
const ComparisonInputSchema = z.object({
    brand1: z.string().min(1).max(100).trim(),
    brand2: z.string().min(1).max(100).trim(),
    category: z.string().max(50).optional().default("general"),
});

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
        const parseResult = ComparisonInputSchema.safeParse(body);
        if (!parseResult.success) {
            return errorResponse("Invalid input: " + parseResult.error.message, 400, "VALIDATION_ERROR");
        }

        const { brand1, brand2, category } = parseResult.data;

        // Don't compare same brand
        if (brand1.toLowerCase() === brand2.toLowerCase()) {
            return errorResponse("Cannot compare a brand with itself", 400, "SAME_BRAND");
        }

        // Check API key availability
        const apiKeys = hasApiKeys();
        if (!apiKeys.gemini) {
            return errorResponse(
                "Gemini API not configured for comparison.",
                503,
                "NO_API_KEY"
            );
        }

        // Generate comparison using Gemini
        const env = getEnv();
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY!);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                maxOutputTokens: 2000,
                temperature: 0.7,
            },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
        });

        const prompt = generateComparisonPrompt(brand1, brand2, category);

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse the comparison response
        const comparison = parseComparisonResponse(responseText);

        if (!comparison) {
            return errorResponse(
                "Failed to parse AI comparison response. Please try again.",
                502,
                "PARSE_ERROR"
            );
        }

        const responseTime = Date.now() - startTime;

        const response = NextResponse.json({
            brand1: comparison.brand1,
            brand2: comparison.brand2,
            comparisonSummary: comparison.comparisonSummary,
            advantage: comparison.brand1.totalScore - comparison.brand2.totalScore,
            meta: {
                responseTime,
                timestamp: new Date().toISOString(),
            },
        });

        response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
        response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetIn / 1000)));

        return response;
    } catch (error) {
        console.error("Error in compare-brands API:", error);

        return errorResponse(
            "An unexpected error occurred. Please try again.",
            500,
            "INTERNAL_ERROR"
        );
    }
}

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
