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
        { name: "Apple", category: "smartphones" },
        { name: "Nike", category: "fashion" },
        { name: "Tesla", category: "automotive" },
        { name: "Samsung", category: "smartphones" },
        { name: "Google", category: "technology" },
        { name: "Amazon", category: "ecommerce" },
    ];

    return (
        <div className="w-full max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Brand Name Input */}
                <div className="relative">
                    <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Enter your brand name..."
                        className="w-full px-6 py-4 text-lg bg-gray-800/50 border border-gray-700 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         placeholder-gray-500 transition-all duration-300"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !brand.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 
                         bg-gradient-to-r from-primary-500 to-purple-600 rounded-lg
                         font-semibold text-white transition-all duration-300
                         hover:shadow-lg hover:shadow-primary-500/25
                         disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Analyzing...
                            </span>
                        ) : (
                            "Check Brand"
                        )}
                    </button>
                </div>

                {/* Category Selection */}
                <div className="flex items-center gap-3">
                    <label htmlFor="category" className="text-gray-400 text-sm whitespace-nowrap">
                        Category:
                    </label>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={loading}
                        className="flex-1 px-4 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         text-gray-300 transition-all duration-300 disabled:opacity-50"
                    >
                        {BRAND_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>
            </form>

            {/* Popular brands suggestions */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="text-gray-500 text-sm">Try:</span>
                {popularBrands.map((b) => (
                    <button
                        key={b.name}
                        onClick={() => {
                            setBrand(b.name);
                            setCategory(b.category);
                            onSubmit(b.name, b.category);
                        }}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 text-gray-400 
                       hover:text-white rounded-full transition-colors disabled:opacity-50"
                    >
                        {b.name}
                    </button>
                ))}
            </div>
        </div>
    );
}

