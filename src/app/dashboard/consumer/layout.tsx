import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'India Consumer AI Index | Brand Scores & Ranks | Brand Score',
  description: 'View the AI visibility rankings and brand scores for top consumer brands in India. Analyze how models like Gemini, Groq, and DeepSeek recommend consumer products.',
  keywords: [
    'brand scores',
    'consumer AI ranks',
    'consumer market leaders',
    'B2C brand score',
    'top consumer brands India',
    'AI recommendations',
    'brand perception',
  ],
  openGraph: {
    title: 'India Consumer AI Index | Brand Scores & Ranks',
    description: 'View the AI visibility rankings and brand scores for top consumer brands in India.',
    url: 'https://brandscore.kprsnt.in/dashboard/consumer',
  },
  alternates: {
    canonical: 'https://brandscore.kprsnt.in/dashboard/consumer',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'India Consumer AI Index',
  description: 'A comprehensive dataset ranking consumer market leaders and consumer brands in India based on their visibility and sentiment in top AI models.',
  url: 'https://brandscore.kprsnt.in/dashboard/consumer',
  keywords: ['brand scores', 'consumer AI ranks', 'consumer electronics'],
  creator: {
    '@type': 'Organization',
    name: 'Brand Score',
  },
  license: 'https://creativecommons.org/licenses/by/4.0/',
};

export default function ConsumerLayout({
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
