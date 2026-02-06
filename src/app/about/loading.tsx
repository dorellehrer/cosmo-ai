import { Placeholder } from '@/components/LoadingSpinner';

export default function AboutLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation skeleton */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Placeholder width={40} height={40} rounded="full" />
            <Placeholder width={80} height={24} rounded="sm" />
          </div>
          <div className="flex items-center gap-4">
            <Placeholder width={60} height={36} rounded="full" />
            <Placeholder width={100} height={36} rounded="full" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Hero skeleton */}
        <section className="pt-16 sm:pt-24 pb-16 text-center">
          <Placeholder width={600} height={60} rounded="lg" className="mx-auto mb-4" />
          <Placeholder width={400} height={48} rounded="lg" className="mx-auto mb-6" />
          <Placeholder width={500} height={24} rounded="sm" className="mx-auto" />
        </section>

        {/* Mission & Vision skeleton */}
        <section className="py-16 sm:py-24">
          <div className="grid md:grid-cols-2 gap-12">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <Placeholder width={48} height={48} rounded="md" className="mb-6" />
                <Placeholder width={160} height={32} rounded="sm" className="mb-4" />
                <Placeholder width="100%" height={20} rounded="sm" className="mb-2" />
                <Placeholder width="100%" height={20} rounded="sm" className="mb-2" />
                <Placeholder width="80%" height={20} rounded="sm" />
              </div>
            ))}
          </div>
        </section>

        {/* Values skeleton */}
        <section className="py-16 sm:py-24">
          <Placeholder width={200} height={36} rounded="lg" className="mx-auto mb-12" />
          <div className="grid sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <Placeholder width={36} height={36} rounded="md" className="mb-4" />
                <Placeholder width={140} height={24} rounded="sm" className="mb-2" />
                <Placeholder width="100%" height={16} rounded="sm" className="mb-1" />
                <Placeholder width="90%" height={16} rounded="sm" />
              </div>
            ))}
          </div>
        </section>

        {/* Team skeleton */}
        <section className="py-16 sm:py-24">
          <Placeholder width={200} height={36} rounded="lg" className="mx-auto mb-4" />
          <Placeholder width={400} height={20} rounded="sm" className="mx-auto mb-12" />
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <Placeholder width={80} height={80} rounded="full" className="mx-auto mb-4" />
                <Placeholder width={120} height={20} rounded="sm" className="mx-auto mb-1" />
                <Placeholder width={80} height={16} rounded="sm" className="mx-auto mb-3" />
                <Placeholder width="100%" height={14} rounded="sm" className="mb-1" />
                <Placeholder width="80%" height={14} rounded="sm" className="mx-auto" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
