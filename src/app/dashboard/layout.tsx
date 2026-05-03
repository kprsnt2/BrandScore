import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'India AI Visibility Index | Brand Scores & Ranks | Brand Score',
  description: 'View the AI visibility rankings and brand scores for top Indian brands across 19 industries. Analyze how models like Gemini, Groq, and DeepSeek recommend brands.',
  keywords: [
    'brand scores',
    'AI visibility index',
    'market leaders',
    'industry brand ranks',
    'top companies India',
    'AI perception',
    'AI recommendations',
  ],
  openGraph: {
    title: 'India AI Visibility Index | Brand Scores & Ranks',
    description: 'View the AI visibility rankings and brand scores for top Indian brands across 19 industries.',
    url: 'https://brandscore.kprsnt.in/dashboard',
  },
  alternates: {
    canonical: 'https://brandscore.kprsnt.in/dashboard',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'India AI Visibility Index',
  description: 'A comprehensive dataset ranking Indian brands across 19 industries based on their visibility and sentiment in top AI models.',
  url: 'https://brandscore.kprsnt.in/dashboard',
  keywords: ['brand scores', 'AI visibility index', 'market leaders', 'industry brand ranks'],
  creator: {
    '@type': 'Organization',
    name: 'Brand Score',
  },
  license: 'https://creativecommons.org/licenses/by/4.0/',
};

export default function CorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
