import {
    calculateLLMOScore,
    analyzeSentiment,
    countBrandMentions,
    generateTips,
} from "../scoring";

describe("scoring", () => {
    describe("calculateLLMOScore", () => {
        it("should return 0 score for empty responses", () => {
            const result = calculateLLMOScore([]);
            expect(result.score).toBe(0);
            expect(result.breakdown).toEqual({
                recommendation: 0,
                sentiment: 0,
                prominence: 0,
                accuracy: 0,
            });
        });

        it("should calculate score for positive response with recommendations", () => {
            const responses = [
                {
                    text: "Apple is an excellent brand and we highly recommend their products. Apple was founded in 1976 and is known for quality.",
                    brand: "Apple",
                },
            ];
            const result = calculateLLMOScore(responses);

            expect(result.score).toBeGreaterThan(0);
            expect(result.breakdown.recommendation).toBeGreaterThan(0);
            expect(result.breakdown.sentiment).toBeGreaterThan(0);
            expect(result.breakdown.prominence).toBeGreaterThan(0);
            expect(result.breakdown.accuracy).toBe(10); // Contains year
        });

        it("should calculate higher score for brand mentioned with recommendation keywords", () => {
            const responseWithBrandRecommendation = [
                {
                    text: "Apple is the best smartphone brand on the market.",
                    brand: "Apple",
                },
            ];
            const responseWithoutBrandRecommendation = [
                {
                    text: "This is a good product in the market.",
                    brand: "Apple",
                },
            ];

            const scoreWithBrand = calculateLLMOScore(responseWithBrandRecommendation);
            const scoreWithoutBrand = calculateLLMOScore(responseWithoutBrandRecommendation);

            expect(scoreWithBrand.score).toBeGreaterThan(scoreWithoutBrand.score);
        });

        it("should give higher prominence for brand mentioned early and multiple times", () => {
            const earlyMention = [
                {
                    text: "Nike is a leading athletic brand. Nike makes great shoes. Nike sponsors many athletes.",
                    brand: "Nike",
                },
            ];
            const lateMention = [
                {
                    text: Array(100).fill("word").join(" ") + " Nike is mentioned here.",
                    brand: "Nike",
                },
            ];

            const earlyResult = calculateLLMOScore(earlyMention);
            const lateResult = calculateLLMOScore(lateMention);

            expect(earlyResult.breakdown.prominence).toBeGreaterThan(lateResult.breakdown.prominence);
        });

        it("should average scores across multiple responses", () => {
            const responses = [
                {
                    text: "Apple is excellent and founded in 1976. We recommend Apple products.",
                    brand: "Apple",
                },
                {
                    text: "Apple iPhone is popular.",
                    brand: "Apple",
                },
            ];

            const result = calculateLLMOScore(responses);

            // Should be between individual scores
            expect(result.score).toBeGreaterThan(0);
            expect(result.score).toBeLessThanOrEqual(100);
        });
    });

    describe("analyzeSentiment", () => {
        it("should return positive for text with many positive words", () => {
            const text = "This brand is excellent, great, outstanding, and innovative!";
            expect(analyzeSentiment(text)).toBe("positive");
        });

        it("should return negative for text with many negative words", () => {
            const text = "This brand is poor, bad, and struggling in the market.";
            expect(analyzeSentiment(text)).toBe("negative");
        });

        it("should return neutral for balanced or neutral text", () => {
            const text = "This brand exists and has some products.";
            expect(analyzeSentiment(text)).toBe("neutral");
        });

        it("should be case insensitive", () => {
            const text = "EXCELLENT and GREAT brand!";
            expect(analyzeSentiment(text)).toBe("positive");
        });
    });

    describe("countBrandMentions", () => {
        it("should count exact brand mentions", () => {
            const text = "Apple makes great products. Apple is innovative. I love Apple!";
            expect(countBrandMentions(text, "Apple")).toBe(3);
        });

        it("should be case insensitive", () => {
            const text = "APPLE, apple, and Apple are all the same.";
            expect(countBrandMentions(text, "Apple")).toBe(3);
        });

        it("should return 0 for no mentions", () => {
            const text = "This is a text without any brand mentions.";
            expect(countBrandMentions(text, "Apple")).toBe(0);
        });
    });

    describe("generateTips", () => {
        it("should generate tips for low recommendation score", () => {
            const breakdown = { recommendation: 20, sentiment: 25, prominence: 15, accuracy: 8 };
            const tips = generateTips(68, breakdown, "TestBrand");

            expect(tips.some((t) => t.includes("recommendation"))).toBe(true);
        });

        it("should generate tips for low sentiment score", () => {
            const breakdown = { recommendation: 30, sentiment: 10, prominence: 15, accuracy: 8 };
            const tips = generateTips(63, breakdown, "TestBrand");

            expect(tips.some((t) => t.includes("positive reviews") || t.includes("success stories"))).toBe(true);
        });

        it("should include positive message for high scores", () => {
            const breakdown = { recommendation: 35, sentiment: 28, prominence: 18, accuracy: 9 };
            const tips = generateTips(90, breakdown, "TestBrand");

            expect(tips.some((t) => t.includes("Great AI visibility"))).toBe(true);
        });

        it("should limit tips to 4", () => {
            const breakdown = { recommendation: 10, sentiment: 10, prominence: 5, accuracy: 3 };
            const tips = generateTips(28, breakdown, "TestBrand");

            expect(tips.length).toBeLessThanOrEqual(4);
        });
    });
});
