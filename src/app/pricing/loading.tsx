import { Placeholder } from '@/components/LoadingSpinner';

function PricingCardSkeleton({ popular = false }: { popular?: boolean }) {
  return (
    <div className={`relative bg-white/5 border rounded-2xl p-8 ${
      popular ? 'border-violet-500/30 ring-2 ring-violet-500/10' : 'border-white/10'
    }`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Placeholder width={100} height={24} rounded="full" />
        </div>
      )}

      <div className="mb-6">
        <Placeholder width={60} height={24} rounded="sm" className="mb-2" />
        <Placeholder width="80%" height={16} rounded="sm" />
      </div>

      <div className="mb-6">
        <Placeholder width={100} height={44} rounded="lg" />
      </div>

      <div className="space-y-3 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Placeholder width={20} height={20} rounded="full" />
            <Placeholder width="70%" height={16} rounded="sm" />
          </div>
        ))}
      </div>

      <Placeholder width="100%" height={48} rounded="lg" />
    </div>
  );
}

function FAQSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <Placeholder width="60%" height={20} rounded="sm" className="mb-2" />
      <Placeholder width="100%" height={16} rounded="sm" className="mb-1" />
      <Placeholder width="80%" height={16} rounded="sm" />
    </div>
  );
}

export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header skeleton */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Placeholder width={32} height={32} rounded="full" />
            <Placeholder width={80} height={20} rounded="sm" />
          </div>
          <div className="flex items-center gap-4">
            <Placeholder width={50} height={20} rounded="sm" />
            <Placeholder width={60} height={20} rounded="sm" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero skeleton */}
        <div className="text-center mb-16">
          <Placeholder width={400} height={48} rounded="lg" className="mx-auto mb-4" />
          <Placeholder width={500} height={24} rounded="sm" className="mx-auto" />
        </div>

        {/* Pricing Cards skeleton */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <PricingCardSkeleton />
          <PricingCardSkeleton popular />
        </div>

        {/* FAQ Section skeleton */}
        <div className="mt-20 max-w-3xl mx-auto">
          <Placeholder width={300} height={32} rounded="lg" className="mx-auto mb-8" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <FAQSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
