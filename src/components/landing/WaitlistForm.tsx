'use client';

import { useState } from 'react';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'waitlist' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to subscribe');
      }
      setStatus('success');
      setEmail('');
    } catch (err) {
      console.error('Newsletter signup error:', err);
      setStatus('error');
    }
  };

  return (
    <section
      className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24"
      aria-labelledby="waitlist-heading"
    >
      <div className="bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 border border-white/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-violet-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-fuchsia-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">📬</span>
          </div>

          <h2
            id="waitlist-heading"
            className="text-2xl sm:text-3xl font-bold text-white mb-3"
          >
            Get early access
          </h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">
            Join 12,000+ people on the waitlist. Be the first to know when new features launch
            and get exclusive early-bird pricing.
          </p>

          {status === 'success' ? (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6 max-w-md mx-auto">
              <span className="text-4xl mb-4 block">🎉</span>
              <p className="text-green-400 font-medium">You&apos;re on the list!</p>
              <p className="text-white/60 text-sm mt-2">
                We&apos;ll email you when new features are ready.
              </p>
            </div>
          ) : status === 'error' ? (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-red-400 font-medium">Something went wrong</p>
              <p className="text-white/60 text-sm mt-2">Please try again in a moment.</p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-4 px-5 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm transition-all"
              >
                Try again
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 px-5 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  aria-label="Email address"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Joining...
                    </span>
                  ) : (
                    'Join waitlist'
                  )}
                </button>
              </div>
              <p className="text-white/40 text-xs mt-4">
                No spam, ever. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
