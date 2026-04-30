import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'India Corporate AI Index | Market Leaders & Brand Ranks | Brand Score',
  description: 'Explore the market leaders and AI brand ranks for top corporate companies in India. Check unified brand scores and AI visibility metrics across multiple foundational models.',
  keywords: [
    'market leaders',
    'industry brand ranks',
    'corporate brand scores',
    'AI visibility index',
    'B2B brand score',
    'top companies India',
    'AI perception',
  ],
  openGraph: {
    title: 'India Corporate AI Index | Market Leaders & Brand Ranks',
    description: 'Explore the market leaders and AI brand ranks for top corporate companies in India.',
    url: 'https://brandscore.kprsnt.in/dashboard/corporate',
  },
  alternates: {
    canonical: 'https://brandscore.kprsnt.in/dashboard/corporate',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'India Corporate AI Index',
  description: 'A comprehensive dataset ranking corporate market leaders in India based on their visibility and sentiment in top AI models.',
  url: 'https://brandscore.kprsnt.in/dashboard/corporate',
  keywords: ['market leaders', 'industry brand ranks', 'brand scores'],
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
