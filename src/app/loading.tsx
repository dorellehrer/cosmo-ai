export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center">
      {/* Animated Cosmo logo */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center animate-pulse">
          <span className="text-5xl">✨</span>
        </div>
        {/* Spinning ring */}
        <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-violet-400 animate-spin" />
      </div>
      
      <h1 className="mt-8 text-2xl font-semibold text-white">Cosmo</h1>
      <p className="mt-2 text-white/60">Loading your experience...</p>
      
      {/* Loading bar */}
      <div className="mt-8 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full animate-loading-bar" />
      </div>
    </div>
  );
}
