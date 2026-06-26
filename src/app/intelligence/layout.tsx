import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cross-Industry Intelligence | AI Brand Analytics | rAsh Score',
  description: 'Analyze AI brand visibility across all 19 Indian industries. Compare model biases, discover top movers, and explore score distributions.',
  keywords: [
    'AI brand intelligence',
    'cross-industry analysis',
    'model bias',
    'AI visibility analytics',
    'brand score distribution',
    'India AI index',
    'NVIDIA vs Groq',
  ],
  openGraph: {
    title: 'Cross-Industry Intelligence | AI Brand Analytics',
    description: 'Analyze AI brand visibility across all 19 Indian industries. Compare model biases, discover top movers, and explore score distributions.',
    url: 'https://brandscore.kprsnt.in/intelligence',
  },
  alternates: {
    canonical: 'https://brandscore.kprsnt.in/intelligence',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'India AI Brand Intelligence — Cross-Industry Analysis',
  description: 'A cross-industry analysis of 285 Indian brands across 19 industries, comparing AI model biases, score distributions, and trend movements.',
  url: 'https://brandscore.kprsnt.in/intelligence',
  keywords: ['AI brand intelligence', 'cross-industry analysis', 'model bias', 'AI visibility'],
  creator: {
    '@type': 'Organization',
    name: 'rAsh Score',
  },
  license: 'https://creativecommons.org/licenses/by/4.0/',
};

export default function IntelligenceLayout({
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
