import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { getEnv } from "./env";
import { generateStructuredBrandPrompt, parseAIScoreResponse, AIScoreResponse } from "./prompts";

// Lazy initialization
let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
    if (!genAI) {
        const env = getEnv();
        if (!env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured");
        }
        genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
    return genAI;
}

export interface StructuredModelResponse {
    text: string;
    model: string;
    modelType: "free" | "pro";
    structured?: AIScoreResponse;
}

export async function queryGemini(brand: string, category: string): Promise<StructuredModelResponse> {
    const modelName = "gemini-2.5-flash";
    const model = getClient().getGenerativeModel({
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
            model: "Gemini 2.5 Flash",
            modelType: "free" as const,
            structured: structured || undefined,
        };
    } catch (error) {
        console.error("Gemini API error:", error);
        throw error;
    }
}

// Keep the recommendation function for backward compatibility
export async function queryGeminiRecommendation(brand: string, category: string) {
    const modelName = "gemini-2.5-flash";
    const model = getClient().getGenerativeModel({
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
