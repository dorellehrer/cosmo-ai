'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';

// Custom hook to safely get online status with SSR support
function useOnlineStatus() {
  const getSnapshot = () => navigator.onLine;
  const getServerSnapshot = () => true; // Assume online during SSR
  const subscribe = (callback: () => void) => {
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);
    return () => {
      window.removeEventListener('online', callback);
      window.removeEventListener('offline', callback);
    };
  };
  
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function OfflinePage() {
  const isOnline = useOnlineStatus();
  const redirectInitiated = useRef(false);

  // Handle redirect when coming back online
  useEffect(() => {
    if (isOnline && !redirectInitiated.current) {
      redirectInitiated.current = true;
      const timer = setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center mx-auto mb-8">
          {isOnline ? (
            <span className="text-5xl animate-pulse">✨</span>
          ) : (
            <svg
              className="w-12 h-12 text-white/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-1.414-7.072m-2.121 9.193a9 9 0 01-.001-12.728m0 12.728L3 21m2.929-2.929l2.828-2.828"
              />
            </svg>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4">
          {isOnline ? 'Back Online!' : "You&apos;re Offline"}
        </h1>

        {/* Description */}
        <p className="text-white/70 mb-8">
          {isOnline
            ? 'Connection restored. Redirecting you back...'
            : "It looks like you&apos;ve lost your internet connection. Some features may be limited until you&apos;re back online."}
        </p>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className={`w-3 h-3 rounded-full ${
              isOnline
                ? 'bg-green-500 animate-pulse'
                : 'bg-red-500 animate-pulse'
            }`}
          />
          <span className="text-sm text-white/70">
            {isOnline ? 'Connected' : 'No Connection'}
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold transition-all shadow-lg shadow-violet-500/25 btn-hover-lift"
          >
            Try Again
          </button>

          <Link
            href="/"
            className="block w-full px-6 py-3 border border-white/20 hover:bg-white/10 hover:border-white/30 rounded-full text-white font-semibold transition-all text-center"
          >
            Go to Home
          </Link>
        </div>

        {/* Cached Content Notice */}
        <p className="mt-8 text-sm text-white/50">
          Some pages you&apos;ve visited before may still be available offline.
        </p>

        {/* Nova Branding */}
        <div className="mt-12 flex items-center justify-center gap-2 opacity-50">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-xs">✨</span>
          </div>
          <span className="text-sm text-white/70">Nova AI</span>
        </div>
      </div>
    </div>
  );
}
