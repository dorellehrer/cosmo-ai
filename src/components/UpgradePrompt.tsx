'use client';

import Link from 'next/link';

interface UpgradePromptProps {
  credits: number;
  onClose?: () => void;
  variant?: 'low' | 'empty';
}

export function UpgradePrompt({ credits, onClose, variant = 'low' }: UpgradePromptProps) {
  const isEmpty = variant === 'empty' || credits <= 0;

  return (
    <div className={`mx-4 mb-4 rounded-xl border p-4 ${
      isEmpty
        ? 'bg-red-500/10 border-red-500/30'
        : 'bg-yellow-500/10 border-yellow-500/30'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">
              {isEmpty ? '🚫' : '⚡'}
            </span>
            <h3 className={`font-semibold ${
              isEmpty ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {isEmpty
                ? "You're out of credits"
                : "Credits running low"}
            </h3>
          </div>
          
          <p className="text-white/60 text-sm mb-3">
            {isEmpty 
              ? "Buy credits to keep chatting. Every message uses credits."
              : `You have ${credits} credit${credits === 1 ? '' : 's'} remaining. Top up to keep going!`}
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-sm font-medium transition-colors"
            >
              <span>✨</span>
              Buy Credits
            </Link>
            {!isEmpty && onClose && (
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white/60 text-sm transition-colors"
              >
                Remind me later
              </button>
            )}
          </div>
        </div>

        {!isEmpty && onClose && (
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {isEmpty && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-white/40 text-xs">
            Credits start at $5 for 100 credits. Pro subscribers get 1,000 credits/month automatically.
          </p>
        </div>
      )}
    </div>
  );
}

// Compact version for showing in header or sidebar
export function UsageBadge({ credits, isPro }: { credits: number; isPro: boolean }) {
  if (isPro) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30">
        <span className="text-xs">✨</span>
        <span className="text-violet-300 text-xs font-medium">Pro</span>
        <span className="text-white/40 text-xs">{credits}c</span>
      </div>
    );
  }

  if (credits <= 0) {
    return (
      <Link
        href="/pricing"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
      >
        <span className="text-xs">⚡</span>
        <span className="text-red-400 text-xs font-medium">No credits</span>
      </Link>
    );
  }

  return (
    <Link
      href="/pricing"
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
    >
      <span className="text-xs">💎</span>
      <span className="text-white/60 text-xs font-medium">{credits} credits</span>
    </Link>
  );
}
