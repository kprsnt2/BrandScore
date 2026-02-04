import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#667eea",
};

export const metadata: Metadata = {
    metadataBase: new URL("https://brandscore.kprsnt.in"),
    title: {
        default: "Brand Score - Check Your Brand's AI Visibility | LLMO Score",
        template: "%s | Brand Score",
    },
    description:
        "Discover how AI models like Gemini, Groq (Llama), and OpenRouter models perceive your brand. Get your LLMO Score and optimize for AI-powered recommendations.",
    keywords: [
        "AI brand visibility",
        "LLMO score",
        "LLM optimization",
        "AI recommendations",
        "brand monitoring",
        "brand score",
        "AI SEO",
        "brand analysis",
        "AI perception",
        "LLM marketing",
    ],
    authors: [{ name: "Prashanth Kumar Kadasi", url: "https://kprsnt.in" }],
    creator: "Prashanth Kumar Kadasi",
    publisher: "Brand Score",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://brandscore.kprsnt.in",
        siteName: "Brand Score",
        title: "Brand Score - Check Your Brand's AI Visibility",
        description:
            "See what AI models say about your brand. Get your unified Brand Score and optimize for AI recommendations.",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "Brand Score - AI Visibility Checker",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Brand Score - Check Your Brand's AI Visibility",
        description:
            "Discover how AI models perceive your brand. Get your Brand Score and optimize for AI recommendations.",
        images: ["/og-image.png"],
        creator: "@kprsnt2",
    },
    alternates: {
        canonical: "https://brandscore.kprsnt.in",
    },
    category: "Technology",
};

// JSON-LD structured data
const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Brand Score",
    description:
        "Check your brand's visibility in AI models like Gemini, Llama, and Mistral. Get your Brand Score.",
    url: "https://brandscore.kprsnt.in",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
    },
    author: {
        "@type": "Person",
        name: "Prashanth Kumar Kadasi",
        url: "https://kprsnt.in",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </head>
            <body className={inter.className}>
                <ErrorBoundary>
                    <ToastProvider>
                        <div className="min-h-screen flex flex-col">
                            {/* Skip to main content link for accessibility */}
                            <a
                                href="#main-content"
                                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-500 text-white px-4 py-2 rounded-lg z-50"
                            >
                                Skip to main content
                            </a>

                            {/* Header */}
                            <header className="border-b border-gray-800 backdrop-blur-sm bg-gray-900/50 sticky top-0 z-50">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <div className="flex justify-between items-center py-4">
                                        <a href="/" className="flex items-center gap-2" aria-label="Brand Score Home">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                                                <span className="text-white font-bold text-sm">BS</span>
                                            </div>
                                            <span className="font-bold text-xl gradient-text">Brand Score</span>
                                        </a>
                                        <nav className="flex gap-6 text-sm text-gray-400" aria-label="Main navigation">
                                            <a href="#features" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded">
                                                How it Works
                                            </a>
                                            <a
                                                href="https://kprsnt.in"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                                            >
                                                About
                                            </a>
                                        </nav>
                                    </div>
                                </div>
                            </header>

                            {/* Main Content */}
                            <main id="main-content" className="flex-grow" role="main">
                                {children}
                            </main>

                            {/* Footer */}
                            <footer className="border-t border-gray-800 py-8 text-center text-gray-500 text-sm">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <p>
                                        Built by{" "}
                                        <a
                                            href="https://kprsnt.in"
                                            className="text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Prashanth Kumar Kadasi
                                        </a>
                                    </p>
                                    <p className="mt-1">
                                        Based on{" "}
                                        <a
                                            href="https://kprsnt.in/blog/manipulating-llm-recommendations-brand-influence"
                                            className="text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            LLM Manipulation Research
                                        </a>
                                    </p>
                                    <p className="mt-4 text-gray-600">
                                        © {new Date().getFullYear()} Brand Score. All rights reserved.
                                    </p>
                                </div>
                            </footer>
                        </div>
                    </ToastProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
