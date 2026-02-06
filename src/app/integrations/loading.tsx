export default function IntegrationsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header skeleton */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="h-6 w-24 bg-white/10 rounded animate-skeleton-pulse" />
          <div className="h-6 w-32 bg-white/10 rounded animate-skeleton-pulse" />
          <div className="h-6 w-20 bg-white/10 rounded animate-skeleton-pulse" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero skeleton */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/10 animate-skeleton-pulse" />
          <div className="h-8 w-64 mx-auto mb-3 bg-white/10 rounded animate-skeleton-pulse" />
          <div className="h-4 w-96 mx-auto bg-white/10 rounded animate-skeleton-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="h-1 bg-white/10" />
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 animate-skeleton-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-24 bg-white/10 rounded mb-2 animate-skeleton-pulse" />
                    <div className="h-4 w-32 bg-white/10 rounded animate-skeleton-pulse" />
                  </div>
                </div>
                <div className="flex gap-1 mb-4">
                  <div className="h-5 w-16 bg-white/10 rounded animate-skeleton-pulse" />
                  <div className="h-5 w-16 bg-white/10 rounded animate-skeleton-pulse" />
                  <div className="h-5 w-16 bg-white/10 rounded animate-skeleton-pulse" />
                </div>
                <div className="h-10 bg-white/10 rounded-xl animate-skeleton-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
