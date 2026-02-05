import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-xl">✨</span>
            </div>
            <span className="text-xl font-semibold text-white">Cosmo</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="px-5 py-2 text-white/70 hover:text-white font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="px-5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-medium transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-8 animate-pulse">
            <span className="text-5xl">✨</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Meet Cosmo
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Your AI that actually does things
            </span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
            Not just another chatbot. Cosmo connects to your life — calendar,
            email, smart home, and more. Tell it what you need, it makes it
            happen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/chat"
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold text-lg transition-all shadow-lg shadow-violet-500/25"
            >
              Start chatting — it&apos;s free
            </Link>
            <button className="px-8 py-4 border border-white/20 hover:bg-white/10 rounded-full text-white font-semibold text-lg transition-all">
              Watch demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-16">
          Everything you need, one conversation away
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: '📧',
              title: 'Email & Calendar',
              description:
                'Check emails, schedule meetings, get reminders. Cosmo keeps your day organized.',
            },
            {
              icon: '💡',
              title: 'Smart Home',
              description:
                '"Turn off the lights" — works with Hue, Sonos, and your favorite devices.',
            },
            {
              icon: '🎵',
              title: 'Entertainment',
              description:
                'Play music, find shows, set the mood. Your entertainment, simplified.',
            },
            {
              icon: '🔒',
              title: 'Privacy First',
              description:
                'Your data stays yours. We don\'t sell it, share it, or use it for training.',
            },
            {
              icon: '🌐',
              title: 'Works Everywhere',
              description:
                'Web, mobile, voice. Access Cosmo from any device, anytime.',
            },
            {
              icon: '⚡',
              title: 'No Setup Required',
              description:
                'Sign up, connect accounts, done. No terminal, no configs, no headaches.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-white/60">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-white/10 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to meet your new AI companion?
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Join thousands of people who&apos;ve made Cosmo part of their daily
            routine. It&apos;s free to start.
          </p>
          <Link
            href="/chat"
            className="inline-block px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold text-lg transition-all shadow-lg shadow-violet-500/25"
          >
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-sm">✨</span>
            </div>
            <span className="text-white/60">
              © 2026 Cosmo AI. All rights reserved.
            </span>
          </div>
          <div className="flex gap-6 text-white/40 text-sm">
            <a href="#" className="hover:text-white/60 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white/60 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white/60 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
