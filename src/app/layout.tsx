import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Providers } from '@/components/Providers';
import { isRtlLocale, type Locale } from '@/i18n/config';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#8B5CF6',
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://cosmo.ai'),
    title: t('title'),
    description: t('description'),
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
      title: t('title'),
      description: t('description'),
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
      title: t('title'),
      description: t('description'),
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
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-512.svg" />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
