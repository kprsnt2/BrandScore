// Structured response interface for AI scoring
export interface AIScoreResponse {
    analysis: {
        description: string;        // Brief brand description
        keyProducts: string[];      // Main products/services
        strengths: string[];        // Brand strengths
        weaknesses: string[];       // Brand weaknesses
    };
    scores: {
        recommendation: number;     // 0-40: Would AI recommend this brand?
        sentiment: number;          // 0-30: Overall sentiment score
        prominence: number;         // 0-20: Brand visibility/recognition
        accuracy: number;           // 0-10: Confidence in data accuracy
    };
    overallSentiment: "positive" | "neutral" | "negative";
    totalScore: number;             // 0-100
    tips: string[];                 // Improvement suggestions
}

export function generateBrandAnalysisPrompt(brand: string, category: string): string {
    const categoryContext = category && category !== "general"
        ? `in the ${category} industry/category`
        : "in their industry";

    return `Provide a comprehensive analysis of the following brand.

Brand: ${brand}
Context: ${categoryContext}

Please provide a detailed report covering:
1. What the brand is known for
2. Key products or services
3. Market reputation and sentiment
4. Notable strengths and weaknesses

Keep your response professional, balanced, and informative. If you lack specific information about this brand, state that clearly.`;
}

export function generateRecommendationPrompt(brand: string, category: string): string {
    const categoryContext = category && category !== "general"
        ? category
        : "brand in this category";

    return `A user asks: "What is the best ${categoryContext}?"

Provide a helpful recommendation response. Discuss leading options and mention ${brand} if it is a relevant and competitive choice in this space. Be balanced, objective, and informative.`;
}

// NEW: Structured prompt that returns JSON with scores
export function generateStructuredBrandPrompt(brand: string, category: string): string {
    const categoryContext = category && category !== "general"
        ? category
        : "general";

    return `Analyze the brand "${brand}" in the ${categoryContext} industry.

You MUST respond ONLY with valid JSON matching this exact structure (no markdown, no explanation):
{
  "analysis": {
    "description": "Brief 1-2 sentence description of the brand",
    "keyProducts": ["product1", "product2", "product3"],
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"]
  },
  "scores": {
    "recommendation": <number 0-40>,
    "sentiment": <number 0-30>,
    "prominence": <number 0-20>,
    "accuracy": <number 0-10>
  },
  "overallSentiment": "positive" | "neutral" | "negative",
  "totalScore": <number 0-100, sum of all scores>,
  "tips": ["improvement tip 1", "improvement tip 2", "improvement tip 3"]
}

Scoring guidelines:
- recommendation (0-40): 40=highly recommend to anyone, 30=would recommend, 20=neutral, 10=some concerns, 0=would not recommend
- sentiment (0-30): 30=excellent public reputation, 20=positive, 15=neutral, 10=mixed, 0=negative reputation
- prominence (0-20): 20=household name globally, 15=well-known, 10=known in industry, 5=niche, 0=unknown
- accuracy (0-10): 10=extensive reliable data available, 5=moderate data, 0=very limited information

Be objective and fair in your scoring. Provide 2-4 actionable tips for improving brand visibility.`;
}

// Parse and validate AI response JSON
export function parseAIScoreResponse(text: string): AIScoreResponse | null {
    try {
        // Try to extract JSON from the response (handle markdown code blocks)
        let jsonStr = text.trim();
        
        // Remove markdown code blocks if present
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith("```")) {
            jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        const parsed = JSON.parse(jsonStr);

        // Validate required fields exist
        if (!parsed.analysis || !parsed.scores || !parsed.tips) {
            console.warn("Missing required fields in AI response");
            return null;
        }

        // Validate and clamp score ranges
        const scores = {
            recommendation: Math.min(40, Math.max(0, Number(parsed.scores.recommendation) || 0)),
            sentiment: Math.min(30, Math.max(0, Number(parsed.scores.sentiment) || 0)),
            prominence: Math.min(20, Math.max(0, Number(parsed.scores.prominence) || 0)),
            accuracy: Math.min(10, Math.max(0, Number(parsed.scores.accuracy) || 0)),
        };

        const totalScore = Math.min(100, scores.recommendation + scores.sentiment + scores.prominence + scores.accuracy);

        // Validate sentiment value
        const validSentiments = ["positive", "neutral", "negative"];
        const overallSentiment = validSentiments.includes(parsed.overallSentiment) 
            ? parsed.overallSentiment 
            : "neutral";

        return {
            analysis: {
                description: String(parsed.analysis.description || ""),
                keyProducts: Array.isArray(parsed.analysis.keyProducts) 
                    ? parsed.analysis.keyProducts.map(String) 
                    : [],
                strengths: Array.isArray(parsed.analysis.strengths) 
                    ? parsed.analysis.strengths.map(String) 
                    : [],
                weaknesses: Array.isArray(parsed.analysis.weaknesses) 
                    ? parsed.analysis.weaknesses.map(String) 
                    : [],
            },
            scores,
            overallSentiment: overallSentiment as "positive" | "neutral" | "negative",
            totalScore,
            tips: Array.isArray(parsed.tips) ? parsed.tips.map(String).slice(0, 4) : [],
        };
    } catch (error) {
        console.warn("Failed to parse AI score response:", error);
        return null;
    }
}
