'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const PRO_FEATURES = [
  '✨ Unlimited AI messages',
  '🎨 DALL-E image generation (50/day)',
  '📅 Google Calendar (read + create + update)',
  '📧 Gmail search & reading',
  '📁 Google Drive file search',
  '🎵 Spotify playback & search',
  '📝 Notion search & page creation',
  '💬 Slack messages & channels',
  '📱 WhatsApp messaging',
  '🎮 Discord servers & channels',
  '📞 AI Phone Calls ($0.10/min)',
  '💡 Philips Hue smart lighting',
  '🔊 Sonos multi-room audio',
  '🔄 Automated routines',
  '🧠 Personal AI Agent',
  '🔒 Priority support',
];

const BUILT_IN_TOOLS = [
  { icon: '🔍', name: 'Web Search' },
  { icon: '🌐', name: 'Page Reader' },
  { icon: '📄', name: 'URL Summaries' },
  { icon: '🧮', name: 'Calculator' },
  { icon: '🕐', name: 'Date & Time' },
  { icon: '🌍', name: 'Translation' },
  { icon: '⛅', name: 'Weather' },
  { icon: '📂', name: 'File Access' },
  { icon: '📋', name: 'Clipboard' },
];

const INTEGRATION_TOOLS = [
  { icon: '📅', name: 'Google Calendar' },
  { icon: '📧', name: 'Gmail' },
  { icon: '📁', name: 'Google Drive' },
  { icon: '🎵', name: 'Spotify' },
  { icon: '📝', name: 'Notion' },
  { icon: '💬', name: 'Slack' },
  { icon: '📱', name: 'WhatsApp' },
  { icon: '🎮', name: 'Discord' },
  { icon: '📞', name: 'AI Calls' },
  { icon: '🎨', name: 'Image Gen' },
  { icon: '💡', name: 'Philips Hue' },
  { icon: '🔊', name: 'Sonos' },
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [userTier, setUserTier] = useState<string>('expired');
  const [trialRemaining, setTrialRemaining] = useState<string | null>(null);
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
          if (data.trialRemaining) setTrialRemaining(data.trialRemaining);
        })
        .catch(console.error);
    }
  }, [session]);

  const handleUpgrade = async () => {
    if (!session) {
      window.location.href = '/sign-in?callbackUrl=/pricing';
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  };

  const isActivePro = userTier === 'pro';
  const isActiveTrial = userTier === 'trial';

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
            Your AI assistant, supercharged
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Try Nova Pro free for 3 days. Unlimited messages, all integrations, AI phone calls, and more.
          </p>
        </div>

        {/* Single Pro Card */}
        <div className="max-w-lg mx-auto mb-20">
          <div className="relative bg-white/5 border border-violet-500/50 ring-2 ring-violet-500/20 rounded-2xl p-8 animate-fade-in">
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                {isActiveTrial ? `Trial — ${trialRemaining}` : '3-Day Free Trial'}
              </span>
            </div>

            <div className="text-center mb-6 mt-2">
              <h2 className="text-2xl font-bold text-white mb-1">Nova Pro</h2>
              <p className="text-white/50 text-sm">Everything you need, nothing you don&apos;t</p>
            </div>

            <div className="text-center mb-8">
              <span className="text-5xl font-bold text-white">$20</span>
              <span className="text-white/50 text-lg">/month</span>
              <p className="text-violet-300 text-sm mt-1">after 3-day free trial</p>
            </div>

            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map((feature) => (
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

            {isActivePro ? (
              <Link
                href="/settings"
                className="block w-full text-center py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium btn-hover-lift"
              >
                ✨ Manage Subscription
              </Link>
            ) : isActiveTrial ? (
              <div className="space-y-3">
                <div className="text-center py-3 px-4 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 font-medium">
                  ✨ Trial Active — {trialRemaining}
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all text-sm"
                >
                  Subscribe now to keep Pro access
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (!session) {
                    window.location.href = '/sign-up';
                  } else {
                    handleUpgrade();
                  }
                }}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-hover-lift"
              >
                {loading ? (
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
                ) : session ? (
                  '🚀 Upgrade to Pro'
                ) : (
                  '🚀 Start Your 3-Day Free Trial'
                )}
              </button>
            )}

            <p className="text-center text-white/30 text-xs mt-4">
              No credit card required for trial. Cancel anytime.
            </p>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-2xl font-semibold text-white text-center mb-3">
            All tools included
          </h2>
          <p className="text-white/50 text-center mb-8 text-sm">
            Every tool is unlocked during your trial. Connect your favorite services and let Nova do the rest.
          </p>

          {/* Built-in Tools */}
          <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">Built-in</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {BUILT_IN_TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5"
              >
                <span className="text-lg">{tool.icon}</span>
                <span className="text-white/80 text-sm flex-1">{tool.name}</span>
                <span className="text-[10px] font-medium text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">INCLUDED</span>
              </div>
            ))}
          </div>

          {/* Integration Tools */}
          <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">Integrations</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INTEGRATION_TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5"
              >
                <span className="text-lg">{tool.icon}</span>
                <span className="text-white/80 text-sm flex-1">{tool.name}</span>
                <span className="text-[10px] font-medium text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded">PRO</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 card-hover group">
              <h3 className="text-white font-medium mb-2 group-hover:text-violet-300 transition-colors">
                How does the 3-day trial work?
              </h3>
              <p className="text-white/70 text-sm">
                Sign up and get instant access to all Pro features for 3 days — no credit card required. When your trial ends, subscribe to keep unlimited access.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 card-hover group">
              <h3 className="text-white font-medium mb-2 group-hover:text-violet-300 transition-colors">
                What happens when my trial expires?
              </h3>
              <p className="text-white/70 text-sm">
                You&apos;ll be prompted to subscribe to Pro ($20/month). Your conversations and settings are preserved — just subscribe to pick up where you left off.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 card-hover group">
              <h3 className="text-white font-medium mb-2 group-hover:text-violet-300 transition-colors">
                How do AI Phone Calls work?
              </h3>
              <p className="text-white/70 text-sm">
                Tell Nova who to call and what to say. The AI makes the call on your behalf, then provides a transcript and summary. Billed at $0.10/minute.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 card-hover group">
              <h3 className="text-white font-medium mb-2 group-hover:text-violet-300 transition-colors">
                Can I cancel my subscription?
              </h3>
              <p className="text-white/70 text-sm">
                Yes! Cancel anytime from your settings page. You&apos;ll keep Pro access until the end of your billing period.
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
