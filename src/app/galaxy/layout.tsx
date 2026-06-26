import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brand Galaxy | AI Visibility Universe | rAsh Score',
  description: 'Explore 285 Indian brands as stars in an interactive galaxy. Each star\'s size and brightness reflects its AI visibility score.',
  openGraph: {
    title: 'Brand Galaxy | rAsh Score',
    description: 'An interactive universe of AI brand visibility. Every star is a real brand.',
    url: 'https://brandscore.kprsnt.in/galaxy',
  },
  alternates: { canonical: 'https://brandscore.kprsnt.in/galaxy' },
};

export default function GalaxyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
