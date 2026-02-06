import { Placeholder } from '@/components/LoadingSpinner';

function ConversationItemSkeleton() {
  return (
    <div className="px-3 py-3 rounded-lg">
      <Placeholder width="70%" height={16} rounded="sm" className="mb-1" />
      <Placeholder width="40%" height={12} rounded="sm" />
    </div>
  );
}

export default function ChatLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:block w-72 bg-slate-900/95 border-e border-white/10">
        <div className="flex flex-col h-full">
          {/* New chat button skeleton */}
          <div className="p-4 border-b border-white/10">
            <Placeholder width="100%" height={44} rounded="lg" />
          </div>

          {/* Conversations list skeleton */}
          <div className="flex-1 p-2 space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <ConversationItemSkeleton key={i} />
            ))}
          </div>

          {/* Sidebar footer skeleton */}
          <div className="p-4 border-t border-white/10 space-y-1">
            <Placeholder width="100%" height={36} rounded="lg" />
            <Placeholder width="100%" height={36} rounded="lg" />
            <Placeholder width="100%" height={36} rounded="lg" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header skeleton */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
          <div className="px-4 py-4 flex items-center gap-4">
            {/* Mobile menu button placeholder */}
            <div className="lg:hidden">
              <Placeholder width={40} height={40} rounded="lg" />
            </div>
            
            {/* Logo and title */}
            <div className="flex items-center gap-3">
              <Placeholder width={40} height={40} rounded="full" />
              <div>
                <Placeholder width={80} height={20} rounded="sm" className="mb-1" />
                <Placeholder width={120} height={14} rounded="sm" />
              </div>
            </div>
            
            <div className="flex-1" />
            
            {/* Command palette button */}
            <Placeholder width={140} height={36} rounded="lg" />
          </div>
        </header>

        {/* Chat Area skeleton */}
        <main className="flex-1 overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Welcome state skeleton */}
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center animate-pulse">
                    <span className="text-3xl">✨</span>
                  </div>
                </div>
                {/* Spinning ring */}
                <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-violet-400/30 animate-spin" />
              </div>
              
              <Placeholder width={200} height={32} rounded="lg" className="mb-2" />
              <Placeholder width={300} height={20} rounded="sm" className="mb-8" />
              
              {/* Suggestion buttons skeleton */}
              <div className="flex flex-wrap gap-2 justify-center">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Placeholder key={i} width={140} height={40} rounded="full" />
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Input Area skeleton */}
        <footer className="border-t border-white/10 backdrop-blur-sm bg-white/5">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex gap-3">
              <Placeholder width="100%" height={48} rounded="full" className="flex-1" />
              <Placeholder width={80} height={48} rounded="full" />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
