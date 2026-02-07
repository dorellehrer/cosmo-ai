'use client';

const badges = [
  {
    icon: '🔒',
    title: 'AES-256 encryption',
    description: 'Your integration tokens are encrypted with AES-256-GCM',
  },
  {
    icon: '🛡️',
    title: 'Secure OAuth2',
    description: 'Industry-standard OAuth2 for all integrations',
  },
  {
    icon: '🚫',
    title: 'No data selling',
    description: 'We never sell your data. Ever.',
  },
  {
    icon: '🔐',
    title: 'Security headers',
    description: 'CSP, HSTS, and strict security policies enforced',
  },
];

const integrations = [
  { name: 'Google', icon: '🔵' },
  { name: 'Slack', icon: '🟣' },
  { name: 'Spotify', icon: '🟢' },
  { name: 'Notion', icon: '⚪' },
];

export function TrustBadges() {
  return (
    <section
      className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24"
      aria-labelledby="trust-heading"
    >
      <div className="text-center mb-12">
        <h2
          id="trust-heading"
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          Security you can trust
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Your privacy is our priority. We built Nova with security from the ground up.
        </p>
      </div>

      {/* Security badges */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        {badges.map((badge) => (
          <div
            key={badge.title}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition-all"
          >
            <div className="text-4xl mb-4">{badge.icon}</div>
            <h3 className="text-white font-semibold mb-2">{badge.title}</h3>
            <p className="text-white/60 text-sm">{badge.description}</p>
          </div>
        ))}
      </div>

      {/* Trusted integrations */}
      <div className="text-center">
        <p className="text-white/40 text-sm uppercase tracking-wider mb-6">
          Works with
        </p>
        <div className="flex flex-wrap justify-center gap-8 items-center">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center gap-2 text-white/60 hover:text-white/80 transition-colors"
            >
              <span className="text-2xl">{integration.icon}</span>
              <span className="font-medium">{integration.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
