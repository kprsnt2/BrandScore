import { getEnv } from "./env";
import { generateBrandAnalysisPrompt, generateRecommendationPrompt } from "./prompts";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

interface NvidiaMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

interface NvidiaResponse {
    id: string;
    choices: {
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

async function callNvidiaAPI(messages: NvidiaMessage[], model: string, maxTokens: number = 2000): Promise<string> {
    const env = getEnv();
    if (!env.NVIDIA_API_KEY) {
        throw new Error("NVIDIA_API_KEY is not configured");
    }

    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.NVIDIA_API_KEY}`,
        },
        body: JSON.stringify({
            model: model,
            messages,
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: maxTokens,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NVIDIA API error: ${response.status} - ${errorText}`);
    }

    const data: NvidiaResponse = await response.json();
    return data.choices[0]?.message?.content || "";
}

export async function queryNvidia(brand: string, category: string, model: string = "minimaxai/minimax-m2.7") {
    const prompt = generateBrandAnalysisPrompt(brand, category);

    try {
        const text = await callNvidiaAPI([{ role: "user", content: prompt }], model, 2000);

        // Extract simple model name for display
        const displayModel = model.split("/").pop() || model;

        return {
            text,
            model: `${displayModel} (NVIDIA)`,
            modelType: "free" as const,
        };
    } catch (error) {
        console.error(`NVIDIA ${model} API error:`, error);
        // Fallback to Mistral if primary fails
        if (model !== "mistralai/mistral-large-3-675b-instruct-2512") {
            console.warn(`NVIDIA: falling back to Mistral Large 3...`);
            return queryNvidia(brand, category, "mistralai/mistral-large-3-675b-instruct-2512");
        }
        throw error;
    }
}

export async function queryNvidiaRecommendation(brand: string, category: string) {
    const prompt = generateRecommendationPrompt(brand, category);

    try {
        const text = await callNvidiaAPI([{ role: "user", content: prompt }], "minimaxai/minimax-m2.7", 500);
        return text;
    } catch (error) {
        console.error("NVIDIA MiniMax recommendation error:", error);
        // Fallback to Mistral
        try {
            return await callNvidiaAPI([{ role: "user", content: prompt }], "mistralai/mistral-large-3-675b-instruct-2512", 500);
        } catch (fallbackError) {
            console.error("NVIDIA Mistral recommendation fallback error:", fallbackError);
            throw error;
        }
    }
}
