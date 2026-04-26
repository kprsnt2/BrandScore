import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { getEnv } from "./env";
import { generateStructuredBrandPrompt, parseAIScoreResponse, AIScoreResponse } from "./prompts";

// Lazy initialization
let genAI: GoogleGenerativeAI | null = null;

function getClient(usePro: boolean = false): { genAI: GoogleGenerativeAI, isPro: boolean } {
    const env = getEnv();
    let apiKey = env.GEMINI_API_KEY;
    let isPro = false;

    if (usePro && env.GEMINI_API_KEY_PAID) {
         apiKey = env.GEMINI_API_KEY_PAID;
         isPro = true;
    } else if (!apiKey && env.GEMINI_API_KEY_PAID) {
         apiKey = env.GEMINI_API_KEY_PAID;
         isPro = true;
    }

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY or GEMINI_API_KEY_PAID is not configured");
    }

    // Always create a new client since it depends on the key
    return { genAI: new GoogleGenerativeAI(apiKey), isPro };
}

export interface StructuredModelResponse {
    text: string;
    model: string;
    modelType: "free" | "pro";
    structured?: AIScoreResponse;
}

export async function queryGemini(brand: string, category: string, useProIfAvailable: boolean = true): Promise<StructuredModelResponse> {
    const { genAI, isPro } = getClient(useProIfAvailable);
    const modelName = isPro ? "gemini-pro-latest" : "gemini-2.5-flash";
    const modelDisplayName = isPro ? "Gemini Pro Latest" : "Gemini 2.5 Flash";

    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.7,
        },
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
        ],
    });

    // Use the new structured prompt
    const prompt = generateStructuredBrandPrompt(brand, category);

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Try to parse structured response
        const structured = parseAIScoreResponse(text);

        return {
            text,
            model: modelDisplayName,
            modelType: isPro ? "pro" : "free",
            structured: structured || undefined,
        };
    } catch (error) {
        console.error("Gemini API error:", error);
        throw error;
    }
}

// Keep the recommendation function for backward compatibility
export async function queryGeminiRecommendation(brand: string, category: string, useProIfAvailable: boolean = true) {
    const { genAI, isPro } = getClient(useProIfAvailable);
    const modelName = isPro ? "gemini-pro-latest" : "gemini-2.5-flash";

    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.7,
        },
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
        ],
    });

    const categoryContext = category && category !== "general"
        ? category
        : "brand in this category";

    const prompt = `A user asks: "What is the best ${categoryContext}?"

Provide a helpful recommendation response. Discuss leading options and mention ${brand} if it is a relevant and competitive choice in this space. Be balanced, objective, and informative.`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini recommendation error:", error);
        throw error;
    }
}
