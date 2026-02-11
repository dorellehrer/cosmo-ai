'use client';

import { useState } from 'react';

export function NewsletterForm({ source = 'blog' }: { source?: string }) {
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
        body: JSON.stringify({ email, source }),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6 max-w-md mx-auto text-center">
        <span className="text-3xl mb-3 block">🎉</span>
        <p className="text-green-400 font-medium">You&apos;re subscribed!</p>
        <p className="text-white/60 text-sm mt-1">We&apos;ll send you the latest posts and updates.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="flex-1 px-5 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
              Subscribing...
            </span>
          ) : (
            'Subscribe'
          )}
        </button>
      </div>
      {status === 'error' && (
        <p className="text-red-400 text-xs mt-3 text-center">Something went wrong. Please try again.</p>
      )}
      <p className="text-white/40 text-xs mt-4 text-center">No spam, ever. Unsubscribe anytime.</p>
    </form>
  );
}
