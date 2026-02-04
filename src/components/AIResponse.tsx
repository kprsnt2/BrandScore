"use client";

interface AIResponseProps {
    response: {
        model: string;
        modelType: "free" | "pro";
        text: string;
        sentiment: "positive" | "neutral" | "negative";
        mentionsCount: number;
    };
}

export default function AIResponse({ response }: AIResponseProps) {
    const sentimentConfig = {
        positive: { color: "text-green-400", bg: "bg-green-500/10", icon: "😊", label: "Positive" },
        neutral: { color: "text-yellow-400", bg: "bg-yellow-500/10", icon: "😐", label: "Neutral" },
        negative: { color: "text-red-400", bg: "bg-red-500/10", icon: "😟", label: "Negative" },
    };

    const modelIcons: Record<string, string> = {
        "Gemini Flash": "✨",
        "Gemini Pro": "🌟",
        "Claude Haiku": "🎋",
        "Claude Opus": "🎭",
        "GPT-4": "🤖",
        "GPT-3.5": "💬",
    };

    const sentiment = sentimentConfig[response.sentiment];

    return (
        <div className="card card-hover p-5">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{modelIcons[response.model] || "🤖"}</span>
                    <span className="font-semibold">{response.model}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${response.modelType === "pro" ? "badge-pro" : "badge-free"
                        }`}>
                        {response.modelType.toUpperCase()}
                    </span>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${sentiment.bg}`}>
                    <span>{sentiment.icon}</span>
                    <span className={sentiment.color}>{sentiment.label}</span>
                </div>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed mb-3">
                {response.text}
            </p>

            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-700 pt-3">
                <span>Brand mentioned: {response.mentionsCount}x</span>
                <span>Response analyzed</span>
            </div>
        </div>
    );
}
