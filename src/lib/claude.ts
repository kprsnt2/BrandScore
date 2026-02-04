import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "./env";
import { generateBrandAnalysisPrompt, generateRecommendationPrompt } from "./prompts";

// Lazy initialization
let anthropic: Anthropic | null = null;

function getClient(): Anthropic {
    if (!anthropic) {
        const env = getEnv();
        if (!env.ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY is not configured");
        }
        anthropic = new Anthropic({
            apiKey: env.ANTHROPIC_API_KEY,
        });
    }
    return anthropic;
}

export async function queryClaude(brand: string, modelType: "free" | "pro" = "free") {
    // Using Haiku only for now - Sonnet disabled (will enable in future)
    const modelName = "claude-3-haiku-20240307";

    const prompt = generateBrandAnalysisPrompt(brand, "general");

    try {
        const message = await getClient().messages.create({
            model: modelName,
            max_tokens: 500,
            messages: [
                { role: "user", content: prompt }
            ],
        });

        const textContent = message.content.find(c => c.type === "text");
        return {
            text: textContent ? textContent.text : "No response generated",
            model: modelType === "pro" ? "Claude Sonnet" : "Claude Haiku",
            modelType,
        };
    } catch (error) {
        console.error("Claude API error:", error);
        throw error;
    }
}

export async function queryClaudeRecommendation(brand: string, modelType: "free" | "pro" = "free") {
    // Using Haiku only for now - Sonnet disabled (will enable in future)
    const modelName = "claude-3-haiku-20240307";

    const prompt = generateRecommendationPrompt(brand, "general");

    try {
        const message = await getClient().messages.create({
            model: modelName,
            max_tokens: 300,
            messages: [
                { role: "user", content: prompt }
            ],
        });

        const textContent = message.content.find(c => c.type === "text");
        return textContent ? textContent.text : "";
    } catch (error) {
        console.error("Claude recommendation error:", error);
        throw error;
    }
}
