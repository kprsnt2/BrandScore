import Groq from "groq-sdk";
import { getEnv } from "./env";
import { generateBrandAnalysisPrompt, generateRecommendationPrompt } from "./prompts";

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

export async function queryGroq(brand: string, category: string) {
    // Groq models (free tier)
    // Free: Llama 3.3 70B (fast and good quality)
    const modelName = "llama-3.3-70b-versatile";

    const prompt = generateBrandAnalysisPrompt(brand, category);

    try {
        const chatCompletion = await getClient().chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: modelName,
            max_tokens: 5000,
            temperature: 0.7,
        });

        return {
            text: chatCompletion.choices[0]?.message?.content || "No response generated",
            model: "Llama 3.3 70B (Groq)",
            modelType: "free" as const,
        };
    } catch (error) {
        console.error("Groq API error:", error);
        throw error;
    }
}

export async function queryGroqRecommendation(brand: string, category: string) {
    const modelName = "moonshotai/kimi-k2-instruct"; // Use Kimi K2 for recommendations

    const prompt = generateRecommendationPrompt(brand, category);

    try {
        const chatCompletion = await getClient().chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: modelName,
            max_tokens: 5000,
            temperature: 0.7,
        });

        return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
        console.error("Groq recommendation error:", error);
        throw error;
    }
}
