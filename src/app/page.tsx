import Link from 'next/link';
import {
  Testimonials,
  ComparisonTable,
  FAQ,
  HowItWorks,
  TrustBadges,
  WaitlistForm,
  SocialProof,
  HeroDemo,
} from '@/components/landing';

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
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-lg sm:text-xl">✨</span>
            </div>
            <span className="text-lg sm:text-xl font-semibold text-white">
              Cosmo
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-white/60">
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <Link href="/about" className="hover:text-white transition-colors">
              About
            </Link>
          </div>
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
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-8 sm:pb-16">
          <div className="text-center">
            {/* Announcement banner */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm mb-8 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>Now with 150+ integrations</span>
              <span className="text-violet-400">→</span>
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
                href="/sign-up"
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold text-base sm:text-lg transition-all shadow-lg shadow-violet-500/25 text-center"
              >
                Start free — no credit card
              </Link>
              <a
                href="#demo"
                className="px-6 sm:px-8 py-3 sm:py-4 border border-white/20 hover:bg-white/10 rounded-full text-white font-semibold text-base sm:text-lg transition-all flex items-center justify-center gap-2"
              >
                <span>▶</span> Watch demo
              </a>
            </div>

            {/* Animated demo */}
            <HeroDemo />
          </div>
        </section>

        {/* Social Proof Stats */}
        <SocialProof />

        {/* How It Works Section */}
        <div id="how-it-works">
          <HowItWorks />
        </div>

        {/* Features Section */}
        <section
          id="features"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20"
          aria-labelledby="features-heading"
        >
          <h2
            id="features-heading"
            className="text-2xl sm:text-3xl font-bold text-white text-center mb-10 sm:mb-16"
          >
            Everything you need, one conversation away
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8" role="list">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6 hover:bg-white/10 transition-all animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
                role="listitem"
              >
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-white/60">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <ComparisonTable />

        {/* Testimonials */}
        <Testimonials />

        {/* Trust & Security */}
        <TrustBadges />

        {/* Pricing Section */}
        <section
          id="pricing"
          className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24"
          aria-labelledby="pricing-heading"
        >
          <div className="text-center mb-12">
            <h2
              id="pricing-heading"
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
            >
              Simple, transparent pricing
            </h2>
            <p className="text-white/60 text-lg">Start free, upgrade when you&apos;re ready</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-white mb-2">Free</h3>
              <div className="text-3xl font-bold text-white mb-4">
                $0<span className="text-lg font-normal text-white/60">/month</span>
              </div>
              <p className="text-white/60 mb-6">Perfect for getting started</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-white/80">
                  <span className="text-green-400">✓</span>
                  Unlimited conversations
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <span className="text-green-400">✓</span>
                  Email & calendar
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <span className="text-green-400">✓</span>
                  50 actions/month
                </li>
                <li className="flex items-center gap-3 text-white/40">
                  <span className="text-white/20">✗</span>
                  Smart home control
                </li>
              </ul>
              <Link
                href="/sign-up"
                className="block w-full py-3 text-center border border-white/20 hover:bg-white/10 rounded-full text-white font-medium transition-all"
              >
                Get started free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-violet-600/20 to-fuchsia-600/20 border-2 border-violet-500/50 rounded-2xl p-6 sm:p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full text-white text-sm font-medium">
                Most popular
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
              <div className="text-3xl font-bold text-white mb-4">
                $9<span className="text-lg font-normal text-white/60">/month</span>
              </div>
              <p className="text-white/60 mb-6">For power users</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-white/80">
                  <span className="text-green-400">✓</span>
                  Everything in Free
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <span className="text-green-400">✓</span>
                  Unlimited actions
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <span className="text-green-400">✓</span>
                  Smart home control
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <span className="text-green-400">✓</span>
                  Priority support
                </li>
              </ul>
              <Link
                href="/sign-up"
                className="block w-full py-3 text-center bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-medium transition-all"
              >
                Start 14-day trial
              </Link>
            </div>

            {/* Team Plan */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-white mb-2">Team</h3>
              <div className="text-3xl font-bold text-white mb-4">
                $29<span className="text-lg font-normal text-white/60">/user/mo</span>
              </div>
              <p className="text-white/60 mb-6">For growing teams</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-white/80">
                  <span className="text-green-400">✓</span>
                  Everything in Pro
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <span className="text-green-400">✓</span>
                  Shared workspaces
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <span className="text-green-400">✓</span>
                  Admin controls
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <span className="text-green-400">✓</span>
                  SSO & SAML
                </li>
              </ul>
              <button
                className="block w-full py-3 text-center border border-white/20 hover:bg-white/10 rounded-full text-white font-medium transition-all"
              >
                Contact sales
              </button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FAQ />

        {/* Waitlist Form */}
        <WaitlistForm />

        {/* Final CTA Section */}
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
              href="/sign-up"
              className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold text-base sm:text-lg transition-all shadow-lg shadow-violet-500/25"
            >
              Get started for free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 sm:mt-20" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="text-sm">✨</span>
                </div>
                <span className="text-lg font-semibold text-white">Cosmo</span>
              </div>
              <p className="text-white/40 text-sm mb-4">
                Your AI that actually does things.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-white/40 hover:text-white/60">
                  <span className="sr-only">Twitter</span>𝕏
                </a>
                <a href="#" className="text-white/40 hover:text-white/60">
                  <span className="sr-only">GitHub</span>⌨
                </a>
                <a href="#" className="text-white/40 hover:text-white/60">
                  <span className="sr-only">Discord</span>💬
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <nav aria-label="Product links">
                <ul className="space-y-2 text-white/40 text-sm">
                  <li><a href="#features" className="hover:text-white/60">Features</a></li>
                  <li><a href="#pricing" className="hover:text-white/60">Pricing</a></li>
                  <li><a href="#" className="hover:text-white/60">Integrations</a></li>
                  <li><a href="#" className="hover:text-white/60">Changelog</a></li>
                </ul>
              </nav>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <nav aria-label="Company links">
                <ul className="space-y-2 text-white/40 text-sm">
                  <li><Link href="/about" className="hover:text-white/60">About</Link></li>
                  <li><Link href="/blog" className="hover:text-white/60">Blog</Link></li>
                  <li><a href="#" className="hover:text-white/60">Careers</a></li>
                  <li><a href="mailto:hello@cosmo.ai" className="hover:text-white/60">Contact</a></li>
                </ul>
              </nav>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <nav aria-label="Legal links">
                <ul className="space-y-2 text-white/40 text-sm">
                  <li><a href="#" className="hover:text-white/60">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white/60">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-white/60">Cookie Policy</a></li>
                  <li><a href="#" className="hover:text-white/60">Security</a></li>
                </ul>
              </nav>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-sm text-white/40">
              © 2026 Cosmo AI. All rights reserved.
            </span>
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
