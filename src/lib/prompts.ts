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
