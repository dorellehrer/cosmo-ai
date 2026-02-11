'use client';

import Link from 'next/link';

export function PublicNav() {
  return (
    <nav className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center transition-transform group-hover:scale-105"
            aria-hidden="true"
          >
            <span className="text-lg sm:text-xl">✨</span>
          </div>
          <span className="text-lg sm:text-xl font-semibold text-white">Nova</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/blog"
            className="hidden md:inline-block px-3 py-2 text-sm text-white/70 hover:text-white font-medium transition-colors"
          >
            Blog
          </Link>
          <Link
            href="/showcase"
            className="hidden md:inline-block px-3 py-2 text-sm text-white/70 hover:text-white font-medium transition-colors"
          >
            Showcase
          </Link>
          <Link
            href="/sign-in"
            className="px-3 sm:px-5 py-2 text-sm sm:text-base text-white/70 hover:text-white font-medium transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 sm:px-5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white text-sm sm:text-base font-medium transition-all"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}
