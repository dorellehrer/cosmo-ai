'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MODEL_LIST } from '@/lib/ai/models';

const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 100,
    price: '$5',
    pricePerCredit: '$0.05',
    badge: null,
    popular: false,
  },
  {
    id: 'popular',
    name: 'Popular',
    credits: 500,
    price: '$20',
    pricePerCredit: '$0.04',
    badge: 'Most Popular',
    popular: true,
  },
  {
    id: 'power',
    name: 'Power Pack',
    credits: 1500,
    price: '$50',
    pricePerCredit: '$0.033',
    badge: 'Best Value',
    popular: false,
  },
];

const PRO_FEATURES = [
  '🧠 1,000 credits/month included',
  '✨ 5 intelligence levels — Standard to Genius',
  '💡 Adjustable thinking depth for deeper reasoning',
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
  '🧠 Personal AI Agent',
  '🔒 Priority support',
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [userIsPro, setUserIsPro] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [showCanceled, setShowCanceled] = useState(false);

  useEffect(() => {
    if (searchParams.get('checkout') === 'canceled' || searchParams.get('credits') === 'canceled') {
      setShowCanceled(true);
      setTimeout(() => setShowCanceled(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/usage')
        .then((res) => res.json())
        .then((data) => {
          if (data.isPro !== undefined) setUserIsPro(data.isPro);
          if (data.credits !== undefined) setUserCredits(data.credits);
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
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Failed to start checkout');
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout');
    } finally {
      setLoading(null);
    }
  };

  const handleBuyCredits = async (packageId: string) => {
    if (!session) {
      window.location.href = '/sign-in?callbackUrl=/pricing';
      return;
    }

    setLoading(packageId);
    try {
      const res = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Failed to start checkout');
    } catch (error) {
      console.error('Credit checkout error:', error);
      alert('Failed to start checkout');
    } finally {
      setLoading(null);
    }
  };

  const isActivePro = userIsPro;

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
                <Link href="/chat" className="text-white/60 hover:text-white transition-colors text-sm">Chat</Link>
                <Link href="/settings" className="text-white/60 hover:text-white transition-colors text-sm">Settings</Link>
              </>
            ) : (
              <Link href="/sign-in" className="text-white/60 hover:text-white transition-colors text-sm">Sign In</Link>
            )}
          </nav>
        </div>
      </header>

      {/* Canceled Banner */}
      {showCanceled && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-3 text-center">
          <p className="text-yellow-200 text-sm">Checkout was canceled. No worries, you can try again anytime!</p>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Smarter AI, on your terms
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Every message costs credits. Start with 20 free credits on signup. Buy more anytime, or subscribe to Pro for 1,000 credits/month.
          </p>
        </div>

        {/* Intelligence Levels */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-semibold text-white text-center mb-3">Intelligence Levels</h2>
          <p className="text-white/50 text-center mb-8 text-sm">Every message costs credits. Standard is the cheapest at 1 credit per message.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODEL_LIST.map((model) => (
              <div
                key={model.id}
                className={`relative bg-white/5 border rounded-xl p-5 transition-all hover:bg-white/[0.07] ${
                  model.creditCost === 1 ? 'border-green-500/30' : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{model.icon}</span>
                  <div>
                    <h3 className="text-white font-semibold">{model.label}</h3>
                    <p className="text-white/40 text-xs">{model.description}</p>
                  </div>
                </div>
                <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                  model.creditCost === 1
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                }`}>
                  {model.costLabel}
                  <span className="text-white/30 ml-1">/ message</span>
                </div>
                {model.supportsReasoning && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Adjustable thinking depth
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Credit Packages */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-semibold text-white text-center mb-3">Buy Credits</h2>
          <p className="text-white/50 text-center mb-2 text-sm">
            Credits never expire. Use them for any intelligence level.
          </p>
          {session && (
            <p className="text-center mb-8 text-sm">
              <span className="text-white/40">Current balance: </span>
              <span className={`font-bold ${userCredits > 10 ? 'text-white' : userCredits > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                {userCredits} credits
              </span>
            </p>
          )}
          <div className="grid md:grid-cols-3 gap-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative bg-white/5 border rounded-2xl p-6 transition-all hover:scale-[1.02] ${
                  pkg.popular ? 'border-violet-500/50 ring-2 ring-violet-500/20' : 'border-white/10'
                }`}
              >
                {pkg.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-lg">
                      {pkg.badge}
                    </span>
                  </div>
                )}
                <div className="text-center mb-6 mt-2">
                  <h3 className="text-lg font-bold text-white mb-1">{pkg.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-white">{pkg.credits}</span>
                    <span className="text-white/40 text-sm">credits</span>
                  </div>
                  <p className="text-violet-300 text-sm mt-1">{pkg.price}</p>
                  <p className="text-white/30 text-[11px] mt-0.5">{pkg.pricePerCredit}/credit</p>
                </div>

                {/* Usage examples */}
                <div className="space-y-1.5 mb-6 text-xs text-white/50">
                  <div className="flex justify-between"><span>⚡ Standard messages</span><span className="text-white/70">{pkg.credits}</span></div>
                  <div className="flex justify-between"><span>🧠 Advanced messages</span><span className="text-white/70">{Math.floor(pkg.credits / 3)}</span></div>
                  <div className="flex justify-between"><span>✨ Creative messages</span><span className="text-white/70">{Math.floor(pkg.credits / 4)}</span></div>
                  <div className="flex justify-between"><span>🚀 Max messages</span><span className="text-white/70">{Math.floor(pkg.credits / 8)}</span></div>
                  <div className="flex justify-between"><span>💎 Genius messages</span><span className="text-white/70">{Math.floor(pkg.credits / 20)}</span></div>
                </div>

                <button
                  onClick={() => handleBuyCredits(pkg.id)}
                  disabled={loading === pkg.id}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-all disabled:opacity-50 ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {loading === pkg.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    `Buy for ${pkg.price}`
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Pro Subscription Card */}
        <div className="max-w-lg mx-auto mb-20">
          <h2 className="text-2xl font-semibold text-white text-center mb-3">Pro Subscription</h2>
          <p className="text-white/50 text-center mb-8 text-sm">1,000 credits/month, all integrations, and full platform access.</p>
          <div className="relative bg-white/5 border border-violet-500/50 ring-2 ring-violet-500/20 rounded-2xl p-8 animate-fade-in">
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                {isActivePro ? 'Your Plan' : 'Most Popular'}
              </span>
            </div>

            <div className="text-center mb-6 mt-2">
              <h3 className="text-2xl font-bold text-white mb-1">Nova Pro</h3>
              <p className="text-white/50 text-sm">Everything you need, nothing you don&apos;t</p>
            </div>

            <div className="text-center mb-8">
              <span className="text-5xl font-bold text-white">$20</span>
              <span className="text-white/50 text-lg">/month</span>
              <p className="text-violet-300 text-sm mt-1">1,000 credits included every month</p>
            </div>

            <ul className="space-y-2.5 mb-8 text-sm">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-white/80">
                  <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
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
            ) : (
              <button
                onClick={() => {
                  if (!session) window.location.href = '/sign-up';
                  else handleUpgrade();
                }}
                disabled={loading === 'pro'}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-hover-lift"
              >
                {loading === 'pro' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  '🚀 Subscribe to Pro'
                )}
              </button>
            )}

            <p className="text-center text-white/30 text-xs mt-4">
              Cancel anytime. Credits carry over even without Pro.
            </p>
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
                How do credits work?
              </h3>
              <p className="text-white/70 text-sm">
                Every message costs credits. Standard costs 1 credit/message, Advanced costs 3, Creative costs 4, Max costs 8, and Genius costs 20. New users get 20 free credits. When credits run out, buy more or subscribe to Pro.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 card-hover group">
              <h3 className="text-white font-medium mb-2 group-hover:text-violet-300 transition-colors">
                Do credits expire?
              </h3>
              <p className="text-white/70 text-sm">
                No! Credits never expire. Buy them whenever you need them and use them at your own pace.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 card-hover group">
              <h3 className="text-white font-medium mb-2 group-hover:text-violet-300 transition-colors">
                What is &ldquo;Thinking Depth&rdquo;?
              </h3>
              <p className="text-white/70 text-sm">
                Some models (Advanced and Genius) support adjustable reasoning. Set it to &ldquo;Quick&rdquo; for fast answers, or &ldquo;Deep&rdquo; when you want the AI to think more carefully. The credit cost is the same regardless of depth.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 card-hover group">
              <h3 className="text-white font-medium mb-2 group-hover:text-violet-300 transition-colors">
                What&apos;s included in Pro?
              </h3>
              <p className="text-white/70 text-sm">
                Pro gives you 1,000 credits/month (auto-refilled), all integrations (Google, Spotify, Slack, etc.), AI phone calls, a personal AI agent, and full platform access. You can always buy more credits on top.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 card-hover group">
              <h3 className="text-white font-medium mb-2 group-hover:text-violet-300 transition-colors">
                Can I cancel my subscription?
              </h3>
              <p className="text-white/70 text-sm">
                Yes! Cancel anytime from your settings page. You&apos;ll keep Pro access until the end of your billing period. Your credits remain even without a Pro subscription.
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
