"use client";

import { useState } from "react";
import { BRAND_CATEGORIES } from "@/lib/validation";

interface BrandInputProps {
    onSubmit: (brand: string, category: string) => void;
    loading: boolean;
}

export default function BrandInput({ onSubmit, loading }: BrandInputProps) {
    const [brand, setBrand] = useState("");
    const [category, setCategory] = useState("general");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (brand.trim()) {
            onSubmit(brand.trim(), category);
        }
    };

    const popularBrands = [
        { name: "Apple", category: "mobile-phones" },
        { name: "Nike", category: "fashion" },
        { name: "Tesla", category: "automotive" },
        { name: "Samsung", category: "consumer-electronics" },
        { name: "Google", category: "technology" },
        { name: "Amazon", category: "ecommerce" },
    ];

    return (
        <div className="w-full max-w-2xl mx-auto animate-slide-up">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Brand Name Input */}
                <div className="relative group">
                    {/* Glowing background blur */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-30 group-focus-within:opacity-60 transition duration-500" />
                    
                    <div className="relative">
                        <input
                            type="text"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder="Enter your brand name..."
                            className="w-full px-6 py-4.5 pr-44 text-lg bg-[#16181d]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl
                             focus:outline-none focus:border-indigo-500/50 text-white placeholder-slate-500 transition-all duration-300"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !brand.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-3
                             bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl
                             font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                             disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed shadow-md hover:shadow-indigo-500/20"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Analyzing...
                                </span>
                            ) : (
                                "Check Brand"
                            )}
                        </button>
                    </div>
                </div>

                {/* Category Selection */}
                <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2.5 max-w-sm mx-auto justify-between backdrop-blur-sm">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        Industry Sector:
                    </span>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={loading}
                        className="bg-transparent text-sm focus:outline-none text-indigo-300 font-medium cursor-pointer transition-colors hover:text-indigo-200 disabled:opacity-50"
                    >
                        {BRAND_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value} className="bg-[#1c1f26] text-white">
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>
            </form>

            {/* Popular brands suggestions */}
            <div className="mt-6 flex flex-wrap justify-center items-center gap-2">
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider mr-1">Try:</span>
                {popularBrands.map((b) => (
                    <button
                        key={b.name}
                        onClick={() => {
                            setBrand(b.name);
                            setCategory(b.category);
                            onSubmit(b.name, b.category);
                        }}
                        disabled={loading}
                        className="px-3.5 py-1.5 text-xs bg-white/[0.03] hover:bg-indigo-500/10 border border-white/[0.06] hover:border-indigo-500/30 text-slate-400 
                       hover:text-white rounded-full transition-all duration-300 disabled:opacity-50 hover:-translate-y-0.5"
                    >
                        {b.name}
                    </button>
                ))}
            </div>
        </div>
    );
}

