import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Download Nova AI — Desktop & Mobile',
  description:
    'Get Nova AI on macOS, Windows, and mobile. Download the desktop app or install as a PWA on your phone.',
};

/* ---------- Inline SVG illustration helpers ---------- */

function MacBookIcon() {
  return (
    <svg viewBox="0 0 120 80" className="w-28 h-20 mx-auto mb-4" fill="none">
      <rect x="10" y="4" width="100" height="64" rx="6" stroke="#8B5CF6" strokeWidth="2" fill="#111" />
      <rect x="16" y="10" width="88" height="52" rx="2" fill="#1a1a2e" />
      <circle cx="60" cy="36" r="10" fill="url(#vg)" />
      <text x="60" y="40" textAnchor="middle" fontSize="10" fill="white">✨</text>
      <path d="M0 70 Q60 80 120 70" stroke="#8B5CF6" strokeWidth="2" fill="#222" />
      <defs>
        <linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#D946EF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function WindowsIcon() {
  return (
    <svg viewBox="0 0 120 80" className="w-28 h-20 mx-auto mb-4" fill="none">
      <rect x="10" y="4" width="100" height="60" rx="4" stroke="#8B5CF6" strokeWidth="2" fill="#111" />
      <rect x="16" y="10" width="88" height="48" rx="2" fill="#1a1a2e" />
      {/* Windows logo simplified */}
      <rect x="46" y="26" width="12" height="12" rx="1" fill="#8B5CF6" />
      <rect x="60" y="26" width="14" height="12" rx="1" fill="#A78BFA" />
      <rect x="46" y="40" width="12" height="14" rx="1" fill="#7C3AED" />
      <rect x="60" y="40" width="14" height="14" rx="1" fill="#8B5CF6" />
      <rect x="30" y="64" width="60" height="6" rx="2" fill="#333" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 60 100" className="w-16 h-24 mx-auto mb-4" fill="none">
      <rect x="4" y="2" width="52" height="96" rx="10" stroke="#8B5CF6" strokeWidth="2" fill="#111" />
      <rect x="8" y="14" width="44" height="70" rx="2" fill="#1a1a2e" />
      <circle cx="30" cy="49" r="8" fill="url(#pg)" />
      <text x="30" y="53" textAnchor="middle" fontSize="8" fill="white">✨</text>
      <rect x="22" y="6" width="16" height="4" rx="2" fill="#333" />
      <rect x="20" y="90" width="20" height="3" rx="1.5" fill="#333" />
      <defs>
        <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#D946EF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ---------- Step component ---------- */

function Step({
  number,
  title,
  description,
  icon,
}: {
  number: number;
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/25">
        {number}
      </div>
      <div>
        <p className="text-white font-medium text-base">{title}</p>
        <p className="text-white/60 text-sm mt-1">{description}</p>
        {icon}
      </div>
    </div>
  );
}

/* ---------- Platform card ---------- */

function PlatformCard({
  title,
  illustration,
  children,
  badge,
  cta,
}: {
  title: string;
  illustration: React.ReactNode;
  children: React.ReactNode;
  badge?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] transition-all group relative overflow-hidden">
      {badge && (
        <span className="absolute top-4 right-4 px-3 py-1 text-xs font-medium rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
          {badge}
        </span>
      )}
      {illustration}
      <h3 className="text-xl font-semibold text-white text-center mb-6">
        {title}
      </h3>
      <div className="space-y-5">{children}</div>
      {cta && <div className="mt-8">{cta}</div>}
    </div>
  );
}

/* ---------- iOS Safari mini-illustration ---------- */

function SafariShareIcon() {
  return (
    <svg
      className="inline-block w-6 h-6 text-blue-400 align-middle mx-1"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function ChromeMenuIcon() {
  return (
    <svg
      className="inline-block w-5 h-5 text-white/60 align-middle mx-1"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

/* ---------- Page ---------- */

export default async function DownloadPage() {
  const t = await getTranslations('download');
  const common = await getTranslations('common');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Nav */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center transition-transform group-hover:scale-105">
              <span className="text-lg sm:text-xl">✨</span>
            </div>
            <span className="text-lg sm:text-xl font-semibold text-white">
              {common('nova')}
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/chat"
              className="px-4 sm:px-5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white text-sm sm:text-base font-medium transition-all"
            >
              {common('getStarted')}
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
            {t('title')}
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Platform cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {/* macOS */}
          <PlatformCard
            title={t('macos.title')}
            illustration={<MacBookIcon />}
            badge={t('macos.badge')}
            cta={
              <div className="block w-full text-center px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/50 font-semibold">
                Coming Soon
              </div>
            }
          >
            <Step
              number={1}
              title={t('macos.step1Title')}
              description={t('macos.step1Desc')}
            />
            <Step
              number={2}
              title={t('macos.step2Title')}
              description={t('macos.step2Desc')}
            />
            <Step
              number={3}
              title={t('macos.step3Title')}
              description={t('macos.step3Desc')}
            />
          </PlatformCard>

          {/* Windows */}
          <PlatformCard
            title={t('windows.title')}
            illustration={<WindowsIcon />}
            badge={t('windows.badge')}
            cta={
              <div className="block w-full text-center px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/50 font-semibold">
                Coming Soon
              </div>
            }
          >
            <Step
              number={1}
              title={t('windows.step1Title')}
              description={t('windows.step1Desc')}
            />
            <Step
              number={2}
              title={t('windows.step2Title')}
              description={t('windows.step2Desc')}
            />
            <Step
              number={3}
              title={t('windows.step3Title')}
              description={t('windows.step3Desc')}
            />
          </PlatformCard>

          {/* Mobile PWA */}
          <PlatformCard
            title={t('mobile.title')}
            illustration={<PhoneIcon />}
            badge={t('mobile.badge')}
          >
            {/* iOS section */}
            <div className="border-b border-white/10 pb-5">
              <p className="text-violet-300 font-medium text-sm mb-3 flex items-center gap-2">
                <span className="text-base">🍎</span> {t('mobile.iosTitle')}
              </p>
              <div className="space-y-3">
                <Step
                  number={1}
                  title={t('mobile.iosStep1Title')}
                  description={t('mobile.iosStep1Desc')}
                  icon={<SafariShareIcon />}
                />
                <Step
                  number={2}
                  title={t('mobile.iosStep2Title')}
                  description={t('mobile.iosStep2Desc')}
                />
                <Step
                  number={3}
                  title={t('mobile.iosStep3Title')}
                  description={t('mobile.iosStep3Desc')}
                />
              </div>
            </div>

            {/* Android section */}
            <div className="pt-2">
              <p className="text-violet-300 font-medium text-sm mb-3 flex items-center gap-2">
                <span className="text-base">🤖</span> {t('mobile.androidTitle')}
              </p>
              <div className="space-y-3">
                <Step
                  number={1}
                  title={t('mobile.androidStep1Title')}
                  description={t('mobile.androidStep1Desc')}
                  icon={<ChromeMenuIcon />}
                />
                <Step
                  number={2}
                  title={t('mobile.androidStep2Title')}
                  description={t('mobile.androidStep2Desc')}
                />
              </div>
            </div>
          </PlatformCard>
        </div>

        {/* Web option */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-8 py-6">
            <div className="text-4xl">🌐</div>
            <div className="text-left">
              <p className="text-white font-semibold text-lg">{t('web.title')}</p>
              <p className="text-white/60 text-sm">{t('web.desc')}</p>
            </div>
            <Link
              href="/chat"
              className="px-6 py-3 border border-white/20 hover:bg-white/10 rounded-xl text-white font-medium transition-all whitespace-nowrap"
            >
              {t('web.cta')}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-xs">✨</span>
            </div>
            <span className="text-sm text-white/70">{common('copyright')}</span>
          </div>
          <nav className="flex gap-4 sm:gap-6 text-white/50 text-sm">
            <Link href="/privacy" className="hover:text-white/80 transition-colors">{common('privacy')}</Link>
            <Link href="/terms" className="hover:text-white/80 transition-colors">{common('terms')}</Link>
            <Link href="/contact" className="hover:text-white/80 transition-colors">{common('contact')}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
