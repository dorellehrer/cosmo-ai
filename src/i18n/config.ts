export const locales = ['en', 'es', 'zh', 'hi', 'ar', 'pt', 'fr', 'de', 'ja', 'sv'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  zh: '中文',
  hi: 'हिन्दी',
  ar: 'العربية',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  sv: 'Svenska',
};

// RTL languages
export const rtlLocales: Locale[] = ['ar'];

export const isRtlLocale = (locale: Locale): boolean => {
  return rtlLocales.includes(locale);
};
