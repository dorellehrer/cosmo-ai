'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out Nova',
    features: [
      '50 messages per day',
      'Web search, calculator, date/time',
      'Weather, translation, URL summaries',
      'Web page reading & extraction',
      'Markdown & code rendering',
      'Conversation history',
      'PWA install (works offline)',
    ],
    cta: 'Get Started',
    popular: false,
    isFree: true,
  },
  {
    name: 'Pro',
    price: '$20',
    period: '/month',
    description: 'For power users who need more',
    features: [
      'Unlimited messages',
      'Everything in Free, plus:',
      '🎨 DALL-E image generation',
      '📅 Google Calendar (read + create)',
      '📧 Gmail search & reading',
      '📁 Google Drive file search',
      '🎵 Spotify playback & search',
      '📝 Notion search & page creation',
      '💬 Slack messages & channels',
      'Priority response times',
      'Early access to new tools',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
    isFree: false,
  },
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string>('free');
  const [showCanceled, setShowCanceled] = useState(false);

  useEffect(() => {
    if (searchParams.get('checkout') === 'canceled') {
      setShowCanceled(true);
      setTimeout(() => setShowCanceled(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/usage')
        .then((res) => res.json())
        .then((data) => {
          if (data.tier) setUserTier(data.tier);
        })
        .catch(console.error);
    }
  }, [session]);

  const handleUpgrade = async () => {
    if (!session) {
      window.location.href = '/sign-in?callbackUrl=/pricing';
      return;
    }

    setLoading('pro');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-white text-sm">✨</span>
            </div>
            <span className="text-white font-semibold">Nova AI</span>
          </Link>
          <nav className="flex items-center gap-4">
            {status === 'authenticated' ? (
              <>
                <Link
                  href="/chat"
                  className="text-white/60 hover:text-white transition-colors text-sm"
                >
                  Chat
                </Link>
                <Link
                  href="/settings"
                  className="text-white/60 hover:text-white transition-colors text-sm"
                >
                  Settings
                </Link>
              </>
            ) : (
              <Link
                href="/sign-in"
                className="text-white/60 hover:text-white transition-colors text-sm"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Canceled Banner */}
      {showCanceled && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-3 text-center">
          <p className="text-yellow-200 text-sm">
            Checkout was canceled. No worries, you can try again anytime!
          </p>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Start for free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {TIERS.map((tier, index) => (
            <div
              key={tier.name}
              className={`relative bg-white/5 border rounded-2xl p-8 card-hover animate-fade-in ${
                tier.popular
                  ? 'border-violet-500/50 ring-2 ring-violet-500/20'
                  : 'border-white/10'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">{tier.name}</h2>
                <p className="text-white/50 text-sm">{tier.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                <span className="text-white/50">{tier.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-white/80">
                    <svg
                      className="w-5 h-5 text-green-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.isFree ? (
                userTier === 'free' ? (
                  <Link
                    href="/chat"
                    className="block w-full text-center py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {session ? 'Go to Chat' : 'Get Started'}
                  </Link>
                ) : (
                  <div className="text-center py-3 text-white/50">Current plan</div>
                )
              ) : userTier === 'pro' ? (
                <Link
                  href="/settings"
                  className="block w-full text-center py-3 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium btn-hover-lift"
                >
                  Manage Subscription
                </Link>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={loading === 'pro'}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-hover-lift"
                >
                  {loading === 'pro' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    tier.cta
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Tools Included Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-white text-center mb-3">
            Tools included with every plan
          </h2>
          <p className="text-white/50 text-center mb-8 text-sm">
            All built-in tools are available for free. Pro unlocks integrations and AI-powered image generation.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: '🔍', name: 'Web Search', free: true },
              { icon: '🌐', name: 'Page Reader', free: true },
              { icon: '📄', name: 'URL Summaries', free: true },
              { icon: '🧮', name: 'Calculator', free: true },
              { icon: '🕐', name: 'Date & Time', free: true },
              { icon: '🌍', name: 'Translation', free: true },
              { icon: '⛅', name: 'Weather', free: true },
              { icon: '🎨', name: 'Image Gen', free: false },
              { icon: '📅', name: 'Google Calendar', free: false },
              { icon: '📧', name: 'Gmail', free: false },
              { icon: '📁', name: 'Google Drive', free: false },
              { icon: '🎵', name: 'Spotify', free: false },
              { icon: '📝', name: 'Notion', free: false },
              { icon: '💬', name: 'Slack', free: false },
              { icon: '📂', name: 'File Access', free: true },
              { icon: '📋', name: 'Clipboard', free: true },
            ].map((tool) => (
              <div
                key={tool.name}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5"
              >
                <span className="text-lg">{tool.icon}</span>
                <span className="text-white/80 text-sm flex-1">{tool.name}</span>
                {tool.free ? (
                  <span className="text-[10px] font-medium text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">FREE</span>
                ) : (
                  <span className="text-[10px] font-medium text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded">PRO</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 card-hover group">
              <h3 className="text-white font-medium mb-2 group-hover:text-violet-300 transition-colors">
                Can I cancel my subscription?
              </h3>
              <p className="text-white/70 text-sm">
                Yes! You can cancel anytime from your settings page. You&apos;ll keep Pro access until the end of your billing period.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 card-hover group">
              <h3 className="text-white font-medium mb-2 group-hover:text-violet-300 transition-colors">
                What happens when I hit the free tier limit?
              </h3>
              <p className="text-white/70 text-sm">
                You&apos;ll see a friendly prompt to upgrade. Your limit resets every day at midnight, so you can always come back tomorrow!
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 card-hover group">
              <h3 className="text-white font-medium mb-2 group-hover:text-violet-300 transition-colors">
                Is my payment information secure?
              </h3>
              <p className="text-white/70 text-sm">
                Absolutely. We use Stripe for payment processing, which is PCI compliant and trusted by millions of businesses worldwide.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-sm">✨</span>
            </div>
            <span className="text-white/60">© 2026 Nova AI. All rights reserved.</span>
          </div>
          <nav>
            <div className="flex flex-wrap gap-4 sm:gap-6 text-white/40 text-sm">
              <Link href="/privacy" className="hover:text-white/60">Privacy</Link>
              <Link href="/terms" className="hover:text-white/60">Terms</Link>
              <Link href="/cookies" className="hover:text-white/60">Cookies</Link>
              <Link href="/contact" className="hover:text-white/60">Contact</Link>
              <Link href="/help" className="hover:text-white/60">Help</Link>
            </div>
          </nav>
        </div>
      </footer>
    </div>
  );
}
