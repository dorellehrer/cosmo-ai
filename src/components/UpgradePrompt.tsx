'use client';

import Link from 'next/link';

interface UpgradePromptProps {
  used: number;
  limit: number;
  onClose?: () => void;
  variant?: 'warning' | 'limit' | 'expired';
  trialRemaining?: string | null;
}

export function UpgradePrompt({ used, limit, onClose, variant = 'warning', trialRemaining }: UpgradePromptProps) {
  const percentage = limit > 0 ? (used / limit) * 100 : 100;
  const isLimitReached = variant === 'limit';
  const isExpired = variant === 'expired';

  return (
    <div className={`mx-4 mb-4 rounded-xl border p-4 ${
      isExpired
        ? 'bg-red-500/10 border-red-500/30'
        : isLimitReached 
          ? 'bg-red-500/10 border-red-500/30' 
          : 'bg-yellow-500/10 border-yellow-500/30'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">
              {isExpired ? '⏰' : isLimitReached ? '🚫' : '⚡'}
            </span>
            <h3 className={`font-semibold ${
              isExpired || isLimitReached ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {isExpired 
                ? "Your trial has expired"
                : isLimitReached 
                  ? "You've reached your daily limit" 
                  : trialRemaining
                    ? `Trial ending soon — ${trialRemaining}`
                    : "You're running low on messages"}
            </h3>
          </div>
          
          <p className="text-white/60 text-sm mb-3">
            {isExpired 
              ? "Subscribe to Pro to continue using Nova with unlimited messages and all integrations."
              : isLimitReached 
                ? "Subscribe to Pro for unlimited messages and keep the conversation going!"
                : trialRemaining
                  ? "Your free trial is ending soon. Subscribe to Pro to keep unlimited access."
                  : `You've used ${used} of ${limit} messages today. Subscribe to Pro for unlimited access.`}
          </p>

          {!isExpired && limit > 0 && (
            <div className="w-full bg-white/10 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all ${
                  isLimitReached 
                    ? 'bg-red-500' 
                    : percentage >= 80 
                      ? 'bg-yellow-500' 
                      : 'bg-violet-500'
                }`}
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-sm font-medium transition-colors"
            >
              <span>✨</span>
              {isExpired ? 'Subscribe to Pro' : 'Upgrade to Pro'}
            </Link>
            {!isLimitReached && !isExpired && onClose && (
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white/60 text-sm transition-colors"
              >
                Remind me later
              </button>
            )}
          </div>
        </div>

        {!isLimitReached && !isExpired && onClose && (
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

      {(isLimitReached || isExpired) && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-white/40 text-xs">
            {isExpired
              ? 'Subscribe to Pro ($20/month) for unlimited messages, all integrations, AI phone calls, and more.'
              : 'Your limit resets at midnight. Come back tomorrow or upgrade now for unlimited access.'}
          </p>
        </div>
      )}
    </div>
  );
}

// Compact version for showing in header or sidebar
export function UsageBadge({ used, limit, tier, trialRemaining }: { used: number; limit: number; tier: string; trialRemaining?: string | null }) {
  const isPro = tier === 'pro';
  const isTrial = tier === 'trial';

  if (isPro) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30">
        <span className="text-xs">✨</span>
        <span className="text-violet-300 text-xs font-medium">Pro</span>
      </div>
    );
  }

  if (isTrial) {
    return (
      <Link
        href="/pricing"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-colors"
      >
        <span className="text-xs">⏰</span>
        <span className="text-violet-300 text-xs font-medium">{trialRemaining || 'Trial'}</span>
      </Link>
    );
  }

  // Expired
  return (
    <Link
      href="/pricing"
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
    >
      <span className="text-xs">⚡</span>
      <span className="text-red-400 text-xs font-medium">Upgrade</span>
    </Link>
  );
}
