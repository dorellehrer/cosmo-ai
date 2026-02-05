'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-8">
          <span className="text-5xl">😵</span>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-4">
          Oops! Something went wrong
        </h1>
        
        <p className="text-white/60 mb-8">
          Don&apos;t worry, it&apos;s not you — it&apos;s me. Let me try to fix that for you.
        </p>
        
        {error.digest && (
          <p className="text-white/40 text-sm mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Try again"
          >
            Try again
          </button>
          
          <Link
            href="/"
            className="px-6 py-3 border border-white/20 hover:bg-white/10 rounded-full text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
