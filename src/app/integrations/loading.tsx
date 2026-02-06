import { Placeholder } from '@/components/LoadingSpinner';

function IntegrationCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Gradient accent placeholder */}
      <div className="h-1 skeleton" />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Placeholder width={48} height={48} rounded="lg" />
            <div>
              <Placeholder width={80} height={20} rounded="sm" className="mb-1" />
              <Placeholder width={120} height={14} rounded="sm" />
            </div>
          </div>
        </div>

        {/* Features preview */}
        <div className="flex flex-wrap gap-1 mb-4">
          <Placeholder width={60} height={20} rounded="sm" />
          <Placeholder width={50} height={20} rounded="sm" />
          <Placeholder width={70} height={20} rounded="sm" />
        </div>

        {/* Button */}
        <Placeholder width="100%" height={40} rounded="lg" />
      </div>
    </div>
  );
}

export default function IntegrationsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header skeleton */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Placeholder width={120} height={24} rounded="sm" />
          <Placeholder width={100} height={24} rounded="sm" />
          <Placeholder width={80} height={24} rounded="sm" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section skeleton */}
        <div className="text-center mb-12">
          <Placeholder width={80} height={80} rounded="lg" className="mx-auto mb-6" />
          <Placeholder width={280} height={36} rounded="lg" className="mx-auto mb-3" />
          <Placeholder width={400} height={20} rounded="sm" className="mx-auto" />
        </div>

        {/* Integration Cards skeleton */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <IntegrationCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
