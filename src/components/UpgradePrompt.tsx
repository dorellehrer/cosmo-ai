'use client';

import Link from 'next/link';

interface UpgradePromptProps {
  used: number;
  limit: number;
  onClose?: () => void;
  variant?: 'warning' | 'limit';
}

export function UpgradePrompt({ used, limit, onClose, variant = 'warning' }: UpgradePromptProps) {
  const percentage = (used / limit) * 100;
  const isLimitReached = variant === 'limit';

  return (
    <div className={`mx-4 mb-4 rounded-xl border p-4 ${
      isLimitReached 
        ? 'bg-red-500/10 border-red-500/30' 
        : 'bg-yellow-500/10 border-yellow-500/30'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">
              {isLimitReached ? '🚫' : '⚡'}
            </span>
            <h3 className={`font-semibold ${
              isLimitReached ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {isLimitReached 
                ? "You've reached your daily limit" 
                : "You're running low on messages"}
            </h3>
          </div>
          
          <p className="text-white/60 text-sm mb-3">
            {isLimitReached 
              ? "Upgrade to Pro for unlimited messages and keep the conversation going!"
              : `You've used ${used} of ${limit} messages today. Upgrade to Pro for unlimited access.`}
          </p>

          {/* Progress bar */}
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

          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-sm font-medium transition-colors"
            >
              <span>✨</span>
              Upgrade to Pro
            </Link>
            {!isLimitReached && onClose && (
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white/60 text-sm transition-colors"
              >
                Remind me later
              </button>
            )}
          </div>
        </div>

        {!isLimitReached && onClose && (
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

      {isLimitReached && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-white/40 text-xs">
            Your limit resets at midnight. Come back tomorrow or upgrade now for unlimited access.
          </p>
        </div>
      )}
    </div>
  );
}

// Compact version for showing in header or sidebar
export function UsageBadge({ used, limit, tier }: { used: number; limit: number; tier: string }) {
  const percentage = (used / limit) * 100;
  const isPro = tier === 'pro';

  if (isPro) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30">
        <span className="text-xs">✨</span>
        <span className="text-violet-300 text-xs font-medium">Pro</span>
      </div>
    );
  }

  return (
    <Link
      href="/pricing"
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
        percentage >= 80
          ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
          : 'bg-white/5 border-white/10 hover:bg-white/10'
      }`}
    >
      <span className={`text-xs font-medium ${
        percentage >= 80 ? 'text-yellow-400' : 'text-white/60'
      }`}>
        {used}/{limit}
      </span>
      <span className="text-white/40 text-xs">messages</span>
    </Link>
  );
}
