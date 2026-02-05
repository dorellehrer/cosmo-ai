import Link from 'next/link';

const features = [
  {
    icon: '📧',
    title: 'Email & Calendar',
    description:
      'Check emails, schedule meetings, get reminders. Cosmo keeps your day organized.',
  },
  {
    icon: '💡',
    title: 'Smart Home',
    description:
      '"Turn off the lights" — works with Hue, Sonos, and your favorite devices.',
  },
  {
    icon: '🎵',
    title: 'Entertainment',
    description:
      'Play music, find shows, set the mood. Your entertainment, simplified.',
  },
  {
    icon: '🔒',
    title: 'Privacy First',
    description:
      "Your data stays yours. We don't sell it, share it, or use it for training.",
  },
  {
    icon: '🌐',
    title: 'Works Everywhere',
    description:
      'Web, mobile, voice. Access Cosmo from any device, anytime.',
  },
  {
    icon: '⚡',
    title: 'No Setup Required',
    description:
      'Sign up, connect accounts, done. No terminal, no configs, no headaches.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Skip to content for accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Navigation */}
      <nav 
        className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 sm:gap-3"
            aria-label="Cosmo AI Home"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center" aria-hidden="true">
              <span className="text-lg sm:text-xl">✨</span>
            </div>
            <span className="text-lg sm:text-xl font-semibold text-white">Cosmo</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/sign-in"
              className="px-3 sm:px-5 py-2 text-sm sm:text-base text-white/70 hover:text-white font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="px-4 sm:px-5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white text-sm sm:text-base font-medium transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-32">
          <div className="text-center">
            <div 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-6 sm:mb-8 animate-pulse"
              aria-hidden="true"
            >
              <span className="text-4xl sm:text-5xl">✨</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Meet Cosmo
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Your AI that actually does things
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-8 sm:mb-10 px-4">
              Not just another chatbot. Cosmo connects to your life — calendar,
              email, smart home, and more. Tell it what you need, it makes it
              happen.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link
                href="/chat"
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold text-base sm:text-lg transition-all shadow-lg shadow-violet-500/25 text-center"
              >
                Start chatting — it&apos;s free
              </Link>
              <button 
                className="px-6 sm:px-8 py-3 sm:py-4 border border-white/20 hover:bg-white/10 rounded-full text-white font-semibold text-base sm:text-lg transition-all"
                aria-label="Watch demo video"
              >
                Watch demo
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section 
          className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20"
          aria-labelledby="features-heading"
        >
          <h2 
            id="features-heading"
            className="text-2xl sm:text-3xl font-bold text-white text-center mb-10 sm:mb-16"
          >
            Everything you need, one conversation away
          </h2>
          <div 
            className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8"
            role="list"
          >
            {features.map((feature) => (
              <article
                key={feature.title}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6 hover:bg-white/10 transition-all animate-slide-up"
                role="listitem"
              >
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4" aria-hidden="true">{feature.icon}</div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-white/60">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section 
          className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20"
          aria-labelledby="cta-heading"
        >
          <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-white/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
            <h2 
              id="cta-heading"
              className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4"
            >
              Ready to meet your new AI companion?
            </h2>
            <p className="text-sm sm:text-base text-white/60 mb-6 sm:mb-8 max-w-xl mx-auto">
              Join thousands of people who&apos;ve made Cosmo part of their daily
              routine. It&apos;s free to start.
            </p>
            <Link
              href="/chat"
              className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold text-base sm:text-lg transition-all shadow-lg shadow-violet-500/25"
            >
              Get started for free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 sm:mt-20" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center" aria-hidden="true">
              <span className="text-xs sm:text-sm">✨</span>
            </div>
            <span className="text-sm sm:text-base text-white/60">
              © 2026 Cosmo AI. All rights reserved.
            </span>
          </div>
          <nav aria-label="Footer navigation">
            <div className="flex gap-4 sm:gap-6 text-white/40 text-sm">
              <a href="#" className="hover:text-white/60 transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-white/60 transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-white/60 transition-colors">
                Contact
              </a>
            </div>
          </nav>
        </div>
      </footer>
    </div>
  );
}
