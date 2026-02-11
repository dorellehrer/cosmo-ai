'use client';

import Link from 'next/link';

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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A" />
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0" />
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D" />
      <path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E" />
    </svg>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1DB954">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function NotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.03 2.13c-.466-.373-.746-.56-1.586-.513l-12.717.932c-.467.047-.56.28-.374.466l1.106 1.193zm.793 3.218v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.166V6.352c0-.606-.233-.933-.746-.886l-15.177.886c-.56.047-.747.327-.747.887zm14.337.745c.093.42 0 .84-.42.887l-.7.14v10.264c-.608.327-1.167.514-1.634.514-.747 0-.933-.234-1.494-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.166.84l-3.218.187c-.093-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.452-.234 4.763 7.28v-6.44l-1.214-.14c-.093-.514.28-.887.747-.933l3.228-.187z" />
    </svg>
  );
}

const integrations = [
  { name: 'Google', Icon: GoogleIcon },
  { name: 'Slack', Icon: SlackIcon },
  { name: 'Spotify', Icon: SpotifyIcon },
  { name: 'Notion', Icon: NotionIcon },
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

      {/* Learn more */}
      <div className="text-center mb-12">
        <Link
          href="/security"
          className="text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors"
        >
          Learn more about our security practices →
        </Link>
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
              <integration.Icon className="w-6 h-6" />
              <span className="font-medium">{integration.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
