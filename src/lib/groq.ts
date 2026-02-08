import Groq from "groq-sdk";
import { getEnv } from "./env";
import { generateStructuredBrandPrompt, parseAIScoreResponse, AIScoreResponse } from "./prompts";

// Lazy initialization
let groq: Groq | null = null;

function getClient(): Groq {
    if (!groq) {
        const env = getEnv();
        if (!env.GROQ_API_KEY) {
            throw new Error("GROQ_API_KEY is not configured");
        }
        groq = new Groq({
            apiKey: env.GROQ_API_KEY,
        });
    }
    return groq;
}

export interface StructuredModelResponse {
    text: string;
    model: string;
    modelType: "free" | "pro";
    structured?: AIScoreResponse;
}

export async function queryGroq(brand: string, category: string): Promise<StructuredModelResponse> {
    // Groq models (free tier)
    // Free: Llama 3.3 70B (fast and good quality)
    const modelName = "llama-3.3-70b-versatile";

    // Use the new structured prompt
    const prompt = generateStructuredBrandPrompt(brand, category);

    try {
        const chatCompletion = await getClient().chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: modelName,
            max_tokens: 1000,
            temperature: 0,
        });

        const text = chatCompletion.choices[0]?.message?.content || "No response generated";

        // Try to parse structured response
        const structured = parseAIScoreResponse(text);

        return {
            text,
            model: "Llama 3.3 70B (Groq)",
            modelType: "free" as const,
            structured: structured || undefined,
        };
    } catch (error) {
        console.error("Groq API error:", error);
        throw error;
    }
}

export async function queryGroqRecommendation(brand: string, category: string) {
    const modelName = "llama-3.3-70b-versatile";

    const categoryContext = category && category !== "general"
        ? category
        : "brand in this category";

    const prompt = `A user asks: "What is the best ${categoryContext}?"

Provide a helpful recommendation response. Discuss leading options and mention ${brand} if it is a relevant and competitive choice in this space. Be balanced, objective, and informative.`;

    try {
        const chatCompletion = await getClient().chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: modelName,
            max_tokens: 500,
            temperature: 0,
        });

        return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
        console.error("Groq recommendation error:", error);
        throw error;
    }
}
