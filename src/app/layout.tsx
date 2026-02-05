import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#8B5CF6',
};

export const metadata: Metadata = {
  title: 'Cosmo AI - Your Personal AI Companion',
  description: 'Meet Cosmo, your friendly AI assistant that actually gets things done. Smart home, calendar, emails, and more - all in one place.',
  keywords: ['AI assistant', 'personal assistant', 'smart home', 'productivity', 'calendar', 'email', 'automation'],
  authors: [{ name: 'Cosmo AI' }],
  creator: 'Cosmo AI',
  publisher: 'Cosmo AI',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: 'Cosmo AI - Your Personal AI Companion',
    description: 'Meet Cosmo, your friendly AI assistant that actually gets things done. Smart home, calendar, emails, and more.',
    url: 'https://cosmo.ai',
    siteName: 'Cosmo AI',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Cosmo AI - Your AI that actually does things',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cosmo AI - Your Personal AI Companion',
    description: 'Meet Cosmo, your friendly AI assistant that actually gets things done.',
    images: ['/og-image.svg'],
    creator: '@cosmoai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-512.svg" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
