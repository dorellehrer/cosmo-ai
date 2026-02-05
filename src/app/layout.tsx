import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cosmo AI - Your Personal AI Companion',
  description: 'Meet Cosmo, your friendly AI assistant that actually gets things done. Smart home, calendar, emails, and more - all in one place.',
  keywords: ['AI assistant', 'personal assistant', 'smart home', 'productivity'],
  authors: [{ name: 'Cosmo AI' }],
  openGraph: {
    title: 'Cosmo AI - Your Personal AI Companion',
    description: 'Meet Cosmo, your friendly AI assistant that actually gets things done.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
