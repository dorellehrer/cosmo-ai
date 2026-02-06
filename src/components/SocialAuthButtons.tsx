'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

// Google Icon SVG
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

// GitHub Icon SVG
const GitHubIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
    />
  </svg>
);

interface SocialAuthButtonsProps {
  callbackUrl?: string;
  className?: string;
}

export function SocialAuthButtons({ callbackUrl = '/chat', className = '' }: SocialAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSocialSignIn = async (provider: 'google' | 'github') => {
    setLoadingProvider(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch (error) {
      console.error(`Failed to sign in with ${provider}:`, error);
      setLoadingProvider(null);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Google Button */}
      <button
        type="button"
        onClick={() => handleSocialSignIn('google')}
        disabled={loadingProvider !== null}
        className="w-full flex items-center justify-center gap-3 py-2.5 sm:py-3 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-gray-700 text-sm sm:text-base font-medium transition-all border border-gray-200 shadow-sm"
      >
        {loadingProvider === 'google' ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        <span>Continue with Google</span>
      </button>

      {/* GitHub Button */}
      <button
        type="button"
        onClick={() => handleSocialSignIn('github')}
        disabled={loadingProvider !== null}
        className="w-full flex items-center justify-center gap-3 py-2.5 sm:py-3 bg-[#24292F] hover:bg-[#32383F] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm sm:text-base font-medium transition-all shadow-sm"
      >
        {loadingProvider === 'github' ? (
          <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
        ) : (
          <GitHubIcon />
        )}
        <span>Continue with GitHub</span>
      </button>
    </div>
  );
}

// Divider component for separating social auth from email form
export function AuthDivider({ text = 'or' }: { text?: string }) {
  return (
    <div className="relative my-5 sm:my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/10"></div>
      </div>
      <div className="relative flex justify-center text-xs sm:text-sm">
        <span className="px-3 bg-transparent text-white/40 uppercase tracking-wider">{text}</span>
      </div>
    </div>
  );
}
