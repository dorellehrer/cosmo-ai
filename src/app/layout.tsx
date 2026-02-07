import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { PageTransition } from '@/components/PageTransition';
import { isRtlLocale, type Locale } from '@/i18n/config';
import './globals.css';

// Optimized font loading with next/font
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#8B5CF6',
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.heynova.se'),
    title: t('title'),
    description: t('description'),
    keywords: ['AI assistant', 'personal assistant', 'smart home', 'productivity', 'calendar', 'email', 'automation'],
    authors: [{ name: 'Nova AI' }],
    creator: 'Nova AI',
    publisher: 'Nova AI',
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
      title: t('title'),
      description: t('description'),
      url: 'https://www.heynova.se',
      siteName: 'Nova AI',
      images: [
        {
          url: '/og-image.svg',
          width: 1200,
          height: 630,
          alt: 'Nova AI - Your AI that actually does things',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/og-image.svg'],
      creator: '@heynovaai',
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
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale() as Locale;
  const messages = await getMessages();
  const isRtl = isRtlLocale(locale);

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className={inter.variable}>
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.png" sizes="32x32" type="image/png" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        
        {/* iOS PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Nova" />
        
        {/* Android/Chrome Theme */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Nova" />
        
        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#8B5CF6" />
        <meta name="msapplication-TileImage" content="/icons/icon-144.png" />
        
        {/* Format Detection */}
        <meta name="format-detection" content="telephone=no" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <PageTransition>
              {children}
            </PageTransition>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
