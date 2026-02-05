import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-8">
          <span className="text-5xl">🤔</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Page not found</h1>
        <p className="text-white/60 mb-8 max-w-md">
          Hmm, I couldn&apos;t find what you&apos;re looking for. Let&apos;s get
          you back on track.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-medium transition-all"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
