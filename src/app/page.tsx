import Link from 'next/link';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LazyLoad } from '@/components/PageTransition';
import { Placeholder } from '@/components/LoadingSpinner';

// Feature card component with hover effects
function FeatureCard({ 
  icon, 
  title, 
  description,
  index 
}: { 
  icon: string;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <article
      className="card-hover bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6 hover:bg-white/10 transition-all group"
      role="listitem"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div 
        className="text-3xl sm:text-4xl mb-3 sm:mb-4 transform transition-transform group-hover:scale-110 group-hover:-rotate-3" 
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-white/70">
        {description}
      </p>
    </article>
  );
}

// Skeleton for feature cards
function FeatureCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
      <Placeholder width={48} height={48} rounded="md" className="mb-4" />
      <Placeholder width="60%" height={24} rounded="sm" className="mb-2" />
      <Placeholder width="100%" height={16} rounded="sm" className="mb-1" />
      <Placeholder width="80%" height={16} rounded="sm" />
    </div>
  );
}

export default async function LandingPage() {
  const t = await getTranslations('landing');
  const common = await getTranslations('common');

  const features = [
    { icon: '📧', titleKey: 'email' as const },
    { icon: '💡', titleKey: 'smartHome' as const },
    { icon: '🎵', titleKey: 'entertainment' as const },
    { icon: '🔒', titleKey: 'privacy' as const },
    { icon: '🌐', titleKey: 'everywhere' as const },
    { icon: '⚡', titleKey: 'noSetup' as const },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Skip to content for accessibility */}
      <a href="#main-content" className="skip-to-content">
        {t('skipToContent')}
      </a>

      {/* Navigation */}
      <nav 
        className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50"
        role="navigation"
        aria-label={t('mainNav')}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 sm:gap-3 group"
            aria-label="Cosmo AI Home"
          >
            <div 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center transition-transform group-hover:scale-105" 
              aria-hidden="true"
            >
              <span className="text-lg sm:text-xl">✨</span>
            </div>
            <span className="text-lg sm:text-xl font-semibold text-white">{common('cosmo')}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/sign-in"
              className="px-3 sm:px-5 py-2 text-sm sm:text-base text-white/70 hover:text-white font-medium transition-colors link-underline"
            >
              {common('signIn')}
            </Link>
            <Link
              href="/sign-up"
              className="px-4 sm:px-5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white text-sm sm:text-base font-medium transition-all btn-hover-lift"
            >
              {common('getStarted')}
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-32">
          <div className="text-center">
            <div 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-6 sm:mb-8 animate-pulse hover-scale"
              aria-hidden="true"
            >
              <span className="text-4xl sm:text-5xl">✨</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight animate-fade-in">
              {t('heroTitle')}
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                {t('heroSubtitle')}
              </span>
            </h1>
            <p 
              className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-8 sm:mb-10 px-4 animate-fade-in"
              style={{ animationDelay: '100ms' }}
            >
              {t('heroDescription')}
            </p>
            <div 
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 animate-fade-in"
              style={{ animationDelay: '200ms' }}
            >
              <Link
                href="/chat"
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold text-base sm:text-lg transition-all shadow-lg shadow-violet-500/25 text-center btn-hover-lift"
              >
                {t('startChatting')}
              </Link>
              <button 
                className="px-6 sm:px-8 py-3 sm:py-4 border border-white/20 hover:bg-white/10 hover:border-white/30 rounded-full text-white font-semibold text-base sm:text-lg transition-all"
                aria-label={t('watchDemo')}
              >
                {t('watchDemo')}
              </button>
            </div>
          </div>
        </section>

        {/* Features Section - Lazy loaded for performance */}
        <LazyLoad
          threshold={0.1}
          rootMargin="100px"
          fallback={
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
              <div className="h-10 w-64 mx-auto mb-10 sm:mb-16 skeleton rounded-lg" />
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <FeatureCardSkeleton key={i} />
                ))}
              </div>
            </section>
          }
        >
          <section 
            className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20"
            aria-labelledby="features-heading"
          >
            <h2 
              id="features-heading"
              className="text-2xl sm:text-3xl font-bold text-white text-center mb-10 sm:mb-16"
            >
              {t('featuresHeading')}
            </h2>
            <div 
              className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8"
              role="list"
            >
              {features.map((feature, index) => (
                <FeatureCard
                  key={feature.titleKey}
                  icon={feature.icon}
                  title={t(`features.${feature.titleKey}.title`)}
                  description={t(`features.${feature.titleKey}.description`)}
                  index={index}
                />
              ))}
            </div>
          </section>
        </LazyLoad>

        {/* CTA Section - Lazy loaded */}
        <LazyLoad
          threshold={0.1}
          rootMargin="50px"
          fallback={
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
              <div className="skeleton h-64 rounded-2xl sm:rounded-3xl" />
            </section>
          }
        >
          <section 
            className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20"
            aria-labelledby="cta-heading"
          >
            <div className="card-hover bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-white/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
              <h2 
                id="cta-heading"
                className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4"
              >
                {t('ctaHeading')}
              </h2>
              <p className="text-sm sm:text-base text-white/70 mb-6 sm:mb-8 max-w-xl mx-auto">
                {t('ctaDescription')}
              </p>
              <Link
                href="/chat"
                className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold text-base sm:text-lg transition-all shadow-lg shadow-violet-500/25 btn-hover-lift"
              >
                {t('getStartedFree')}
              </Link>
            </div>
          </section>
        </LazyLoad>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 sm:mt-20" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center" 
              aria-hidden="true"
            >
              <span className="text-xs sm:text-sm">✨</span>
            </div>
            <span className="text-sm sm:text-base text-white/70">
              {common('copyright')}
            </span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <nav aria-label="Footer navigation">
              <div className="flex gap-4 sm:gap-6 text-white/50 text-sm">
                <Link href="/privacy" className="hover:text-white/80 transition-colors">
                  {common('privacy')}
                </Link>
                <Link href="/terms" className="hover:text-white/80 transition-colors">
                  {common('terms')}
                </Link>
                <Link href="/cookies" className="hover:text-white/80 transition-colors">
                  Cookies
                </Link>
                <Link href="/contact" className="hover:text-white/80 transition-colors">
                  {common('contact')}
                </Link>
                <Link href="/help" className="hover:text-white/80 transition-colors">
                  Help
                </Link>
              </div>
            </nav>
            <Suspense fallback={<div className="w-20 h-8 skeleton rounded-lg" />}>
              <LanguageSwitcher />
            </Suspense>
          </div>
        </div>
      </footer>
    </div>
  );
}
