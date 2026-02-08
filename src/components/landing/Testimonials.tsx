'use client';

const highlights = [
  {
    icon: '📅',
    title: 'Calendar & Email',
    content: "Tell Nova to 'schedule a meeting with the design team' and it handles everything — finding availability, creating events, and sending invites through Google Calendar.",
  },
  {
    icon: '🎵',
    title: 'Music & Entertainment',
    content: "Connect Spotify and control your music with natural language. Search for songs, check what's playing, and discover new artists — all through conversation.",
  },
  {
    icon: '🔍',
    title: 'Web Search & Research',
    content: 'Nova can search the web, fetch and summarize articles, check the weather, and calculate math — built-in tools that work without any setup.',
  },
  {
    icon: '📝',
    title: 'Notes & Productivity',
    content: 'Connect Notion to search your workspace and create pages. Link Slack to search messages and stay on top of your team communication.',
  },
  {
    icon: '🌍',
    title: 'Works in 10 Languages',
    content: 'Nova speaks English, Spanish, French, German, Japanese, Portuguese, Chinese, Arabic, Hindi, and Swedish — with more on the way.',
  },
  {
    icon: '🤖',
    title: '5 Intelligence Levels',
    content: 'Choose your AI power level — from free Standard all the way to Genius. Use credits for smarter models, or stay on Standard for free.',

  },
];

export function Testimonials() {
  return (
    <section
      className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24"
      aria-labelledby="highlights-heading"
    >
      <div className="text-center mb-12">
        <h2
          id="highlights-heading"
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          What Nova can do
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Real capabilities, real integrations — here's what Nova handles today
        </p>
      </div>

      {/* Desktop Grid */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {highlights.map((highlight, index) => (
          <article
            key={highlight.title}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-2xl">
                {highlight.icon}
              </div>
              <div>
                <h3 className="text-white font-semibold">{highlight.title}</h3>
              </div>
            </div>
            <p className="text-white/70 mt-4 text-sm leading-relaxed">
              {highlight.content}
            </p>
          </article>
        ))}
      </div>

      {/* Mobile Stack */}
      <div className="md:hidden space-y-4">
        {highlights.map((highlight) => (
          <article
            key={highlight.title}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-2xl">
                {highlight.icon}
              </div>
              <div>
                <h3 className="text-white font-semibold">{highlight.title}</h3>
              </div>
            </div>
            <p className="text-white/70 mt-4 text-sm leading-relaxed">
              {highlight.content}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
