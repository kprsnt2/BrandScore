import { getEnv } from "./env";
import { generateStructuredBrandPrompt, parseAIScoreResponse, AIScoreResponse } from "./prompts";

// OpenRouter API base URL
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface StructuredModelResponse {
    text: string;
    model: string;
    modelType: "free" | "pro";
    structured?: AIScoreResponse;
}

export async function queryOpenRouter(brand: string, category: string): Promise<StructuredModelResponse> {
    const env = getEnv();
    if (!env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // Using openrouter/free as requested
    const modelName = "openrouter/free";

    // Use the new structured prompt
    const prompt = generateStructuredBrandPrompt(brand, category);

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://brandscore.kprsnt.in", // Site URL
                "X-Title": "Brand Score", // Site title
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": modelName,
                "messages": [
                    { "role": "user", "content": prompt }
                ],
                "temperature": 0,
                "max_tokens": 1000,
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenRouter API error: ${response.status} ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "No response generated";

        // Try to parse structured response
        const structured = parseAIScoreResponse(text);

        return {
            text,
            model: "OpenRouter (Free)",
            modelType: "free" as const,
            structured: structured || undefined,
        };
    } catch (error) {
        console.error("OpenRouter API error:", error);
        throw error;
    }
}

export async function queryOpenRouterRecommendation(brand: string, category: string) {
    const env = getEnv();
    if (!env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const modelName = "openrouter/free";

    const categoryContext = category && category !== "general"
        ? category
        : "brand in this category";

    const prompt = `A user asks: "What is the best ${categoryContext}?"

Provide a helpful recommendation response. Discuss leading options and mention ${brand} if it is a relevant and competitive choice in this space. Be balanced, objective, and informative.`;

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://brandscore.kprsnt.in",
                "X-Title": "Brand Score",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": modelName,
                "messages": [
                    { "role": "user", "content": prompt }
                ],
                "temperature": 0,
                "max_tokens": 500,
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (error) {
        console.error("OpenRouter recommendation error:", error);
        throw error;
    }
}
