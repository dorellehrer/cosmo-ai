interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const baseClasses = 'bg-white/10 animate-skeleton-pulse';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };
  
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
      role="presentation"
    />
  );
}

// Pre-built skeleton patterns
export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-violet-600/30'
          : 'bg-white/5'
      }`}>
        <Skeleton variant="text" className="h-4 w-48 mb-2" />
        <Skeleton variant="text" className="h-4 w-32" />
      </div>
    </div>
  );
}

export function FeatureCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <Skeleton variant="circular" className="w-12 h-12 mb-4" />
      <Skeleton variant="text" className="h-6 w-32 mb-2" />
      <Skeleton variant="text" className="h-4 w-full mb-1" />
      <Skeleton variant="text" className="h-4 w-3/4" />
    </div>
  );
}

export function IntegrationCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton variant="rectangular" className="w-12 h-12" />
        <div>
          <Skeleton variant="text" className="h-5 w-24 mb-1" />
          <Skeleton variant="text" className="h-4 w-16" />
        </div>
      </div>
      <Skeleton variant="rectangular" className="w-20 h-9" />
    </div>
  );
}

export function ChatPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header skeleton */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" className="w-10 h-10" />
            <div>
              <Skeleton variant="text" className="h-5 w-16 mb-1" />
              <Skeleton variant="text" className="h-3 w-24" />
            </div>
          </div>
          <Skeleton variant="rectangular" className="w-10 h-10" />
        </div>
      </header>

      {/* Chat area skeleton */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <Skeleton variant="circular" className="w-20 h-20 mb-6" />
            <Skeleton variant="text" className="h-8 w-48 mb-2" />
            <Skeleton variant="text" className="h-5 w-64 mb-8" />
            <div className="flex flex-wrap gap-2 justify-center">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rectangular" className="h-10 w-36 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Input skeleton */}
      <footer className="border-t border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <Skeleton variant="rectangular" className="flex-1 h-12 rounded-full" />
            <Skeleton variant="rectangular" className="w-20 h-12 rounded-full" />
          </div>
        </div>
      </footer>
    </div>
  );
}
