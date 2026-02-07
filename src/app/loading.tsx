export default function Loading() {
  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center"
      role="status"
      aria-label="Loading Nova AI"
    >
      {/* Animated Nova logo */}
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute inset-0 w-28 h-28 -m-2 rounded-full bg-violet-500/20 blur-xl animate-pulse" />
        
        {/* Main logo */}
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-2xl shadow-violet-500/30">
          <span className="text-5xl" aria-hidden="true">✨</span>
        </div>
        
        {/* Spinning ring */}
        <div 
          className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-violet-400/80 animate-spin"
          style={{ animationDuration: '1.2s' }}
        />
        
        {/* Second spinning ring (opposite direction) */}
        <div 
          className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-b-fuchsia-400/50 animate-spin"
          style={{ animationDuration: '1.8s', animationDirection: 'reverse' }}
        />
      </div>
      
      <h1 className="mt-8 text-2xl font-semibold text-white">Nova</h1>
      <p className="mt-2 text-white/70">Loading your experience...</p>
      
      {/* Loading bar */}
      <div className="mt-8 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 rounded-full animate-loading-bar"
          style={{ backgroundSize: '200% 100%' }}
        />
      </div>
      
      {/* Screen reader text */}
      <span className="sr-only">Loading, please wait...</span>
    </div>
  );
}
