import { Placeholder } from '@/components/LoadingSpinner';

function SettingSectionSkeleton({ title, items = 3 }: { title?: boolean; items?: number }) {
  return (
    <section className="mb-8 sm:mb-12">
      {title && <Placeholder width={120} height={24} rounded="sm" className="mb-4" />}
      <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl divide-y divide-white/10">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <Placeholder width="40%" height={18} rounded="sm" className="mb-1" />
              <Placeholder width="70%" height={14} rounded="sm" />
            </div>
            <Placeholder width={48} height={28} rounded="full" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header skeleton */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Placeholder width={100} height={24} rounded="sm" />
          <Placeholder width={80} height={24} rounded="sm" />
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Section skeleton */}
        <section className="mb-8 sm:mb-12">
          <Placeholder width={80} height={24} rounded="sm" className="mb-4" />
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <Placeholder width={64} height={64} rounded="full" />
              <div className="flex-1">
                <Placeholder width="50%" height={28} rounded="sm" className="mb-2" />
                <Placeholder width="30%" height={16} rounded="sm" />
              </div>
            </div>
          </div>
        </section>

        {/* Language Section skeleton */}
        <section className="mb-8 sm:mb-12">
          <Placeholder width={100} height={24} rounded="sm" className="mb-4" />
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-6">
            <Placeholder width="80%" height={16} rounded="sm" className="mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Placeholder key={i} width="100%" height={40} rounded="lg" />
              ))}
            </div>
          </div>
        </section>

        {/* Connected Services skeleton */}
        <section className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-4">
            <Placeholder width={180} height={24} rounded="sm" />
            <Placeholder width={80} height={20} rounded="sm" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Placeholder width={48} height={48} rounded="lg" />
                    <div>
                      <Placeholder width={80} height={18} rounded="sm" className="mb-1" />
                      <Placeholder width={120} height={14} rounded="sm" />
                    </div>
                  </div>
                  <Placeholder width={80} height={24} rounded="full" />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <Placeholder width="40%" height={14} rounded="sm" />
                  <Placeholder width={80} height={28} rounded="lg" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Voice Settings skeleton */}
        <SettingSectionSkeleton title items={3} />

        {/* Preferences skeleton */}
        <SettingSectionSkeleton title items={3} />

        {/* Danger Zone skeleton */}
        <section>
          <Placeholder width={120} height={24} rounded="sm" className="mb-4" />
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-6">
            <Placeholder width="40%" height={18} rounded="sm" className="mb-2" />
            <Placeholder width="90%" height={14} rounded="sm" className="mb-4" />
            <Placeholder width={140} height={36} rounded="lg" />
          </div>
        </section>
      </main>
    </div>
  );
}
