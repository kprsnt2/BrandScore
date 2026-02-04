import { getEnv } from "./env";
import { generateBrandAnalysisPrompt, generateRecommendationPrompt } from "./prompts";

// OpenRouter API base URL
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function queryOpenRouter(brand: string, category: string) {
    const env = getEnv();
    if (!env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // Using a free/low-cost model available on OpenRouter
    // Liquid LFM 40B is often free or very cheap and good quality
    // Alternative: "microsoft/phi-3-medium-128k-instruct:free" or similar if available
    // Using openrouter/free as requested by user
    //const modelName = "google/gemini-2.0-flash-lite-preview-02-05:free";
    // constant fallback: "openrouter/free" is a router, but "google/gemini-2.0-flash-lite-preview-02-05:free" is a specific free model often available.
    // However, user explicitly put "model": "openrouter/free" in the curl command. I should probably use exactly that or a safer specific free model.
    // "openrouter/free" includes multiple models.
    // Let's stick to what allows the curl to work? 
    // Actually, let's use a very reliable free one or the one user asked. User asked "openrouter/free" in the curl example. 
    // But in the text they said "fix gemini response and openrouter to this one". 
    // Maybe they want Gemini to be used via OpenRouter? 
    // No, I'll stick to 'google/gemini-2.0-flash-lite-preview-02-05:free' or 'openrouter/free'.
    // The previous code had "liquid/lfm-40b:free".
    // I will try 'google/gemini-2.0-flash-lite-preview-02-05:free' as it is a high quality free model on OR, 
    // AND the user complained about "gemini response" - maybe they want the *OpenRouter* one to be Gemini too?
    // Let's look closer at the request "fix gemini response AND openrouter to this one".
    // "This one" refers to the curl command. The curl command has `"model": "openrouter/free"`.
    // I will use `openrouter/free` for the OpenRouter integration.

    const modelName = "openrouter/free";
    // Fallback or better option if user has credits: "meta-llama/llama-3-8b-instruct:free"

    const prompt = generateBrandAnalysisPrompt(brand, category);

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
                "temperature": 0.7,
                "max_tokens": 500,
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenRouter API error: ${response.status} ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "No response generated";

        return {
            text,
            model: "OpenRouter (Free)",
            modelType: "free" as const,
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
    const prompt = generateRecommendationPrompt(brand, category);

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
                "temperature": 0.7,
                "max_tokens": 300,
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
