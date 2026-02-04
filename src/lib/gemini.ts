import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "./env";
import { generateBrandAnalysisPrompt, generateRecommendationPrompt } from "./prompts";

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

export async function queryGemini(brand: string, category: string) {
    // Using Gemini 2.5 Flash (free tier) automatically
    const modelName = "gemini-2.5-flash";
    const model = getClient().getGenerativeModel({
        model: modelName,
        generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
        },
    });

    const categoryContext = category && category !== "general"
        ? `in the ${category} industry/category`
        : "";

    const prompt = generateBrandAnalysisPrompt(brand, category);

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        return {
            text: response.text(),
            model: "Gemini 2.5 Flash",
            modelType: "free" as const,
        };
    } catch (error) {
        console.error("Gemini API error:", error);
        throw error;
    }
}

export async function queryGeminiRecommendation(brand: string, category: string) {
    const modelName = "gemini-2.5-flash";
    const model = getClient().getGenerativeModel({
        model: modelName,
        generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7,
        },
    });

    const prompt = generateRecommendationPrompt(brand, category);

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini recommendation error:", error);
        throw error;
    }
}

function getBrandCategory(brand: string): string {
    const categories: Record<string, string> = {
        "apple": "smartphone",
        "samsung": "smartphone",
        "nike": "athletic shoe brand",
        "adidas": "athletic shoe brand",
        "tesla": "electric car",
        "toyota": "car",
        "google": "search engine",
        "amazon": "e-commerce platform",
        "microsoft": "technology company",
        "coca-cola": "soft drink",
    };

    return categories[brand.toLowerCase()] || "brand in their category";
}
