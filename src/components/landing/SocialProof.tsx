'use client';

const stats = [
  { value: '5', label: 'AI models' },
  { value: '6', label: 'Integrations' },
  { value: '11', label: 'Built-in tools' },
  { value: '10', label: 'Languages' },
];

export function SocialProof() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-2">
              {stat.value}
            </div>
            <div className="text-white/60 text-sm sm:text-base">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Real integrations */}
      <div className="mt-12 pt-12 border-t border-white/10">
        <p className="text-center text-white/40 text-sm uppercase tracking-wider mb-8">
          Integrates with
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 text-white/30 text-lg sm:text-xl font-semibold">
          <span className="hover:text-white/50 transition-colors">Google</span>
          <span className="hover:text-white/50 transition-colors">Spotify</span>
          <span className="hover:text-white/50 transition-colors">Notion</span>
          <span className="hover:text-white/50 transition-colors">Slack</span>
        </div>
      </div>
    </section>
  );
}
