import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Nova AI - Our Mission & Vision',
  description: 'Learn about Nova AI, our mission to make AI truly helpful, and the team building the future of personal AI assistants.',
};

const team = [
  {
    name: 'Alex Chen',
    role: 'Co-founder & CEO',
    bio: 'Former Google AI researcher. Believes AI should do things, not just talk about them.',
    avatar: '👨🏻‍💼',
  },
  {
    name: 'Sarah Kim',
    role: 'Co-founder & CTO',
    bio: 'Ex-Stripe engineer. Building infrastructure that connects AI to the real world.',
    avatar: '👩🏻‍💻',
  },
  {
    name: 'Marcus Johnson',
    role: 'Head of Product',
    bio: 'Previously at Apple. Obsessed with making technology invisible.',
    avatar: '👨🏿',
  },
  {
    name: 'Emma Rodriguez',
    role: 'Head of Design',
    bio: 'Former Figma designer. Makes complex things feel simple.',
    avatar: '👩🏽‍🎨',
  },
];

const values = [
  {
    icon: '🎯',
    title: 'Action over talk',
    description: "We believe AI should DO things, not just generate text. Every feature we build is measured by real-world impact.",
  },
  {
    icon: '🔐',
    title: 'Privacy by design',
    description: "Your data is yours. We built Nova from the ground up with privacy as a core principle, not an afterthought.",
  },
  {
    icon: '✨',
    title: 'Magic through simplicity',
    description: "The best technology feels invisible. We work hard so you don't have to.",
  },
  {
    icon: '🤝',
    title: 'User-first, always',
    description: "We don't optimize for engagement or time-on-app. We optimize for helping you get things done and get back to life.",
  },
];

const timeline = [
  { year: '2024', event: 'Nova founded in San Francisco' },
  { year: '2024', event: 'Raised $12M seed round' },
  { year: '2025', event: 'Launched beta with 1,000 users' },
  { year: '2025', event: 'Reached 50,000 active users' },
  { year: '2026', event: 'Public launch & Series A' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-lg sm:text-xl">✨</span>
            </div>
            <span className="text-lg sm:text-xl font-semibold text-white">Nova</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/sign-in"
              className="px-3 sm:px-5 py-2 text-sm sm:text-base text-white/70 hover:text-white font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="px-4 sm:px-5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white text-sm sm:text-base font-medium transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <section className="pt-16 sm:pt-24 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
            We&apos;re building the AI
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              you actually wanted
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto">
            For years, AI promised to change how we work and live. We&apos;re finally making it happen — 
            not through hype, but through real, useful actions.
          </p>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 sm:py-24">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="text-4xl mb-6">🎯</div>
              <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
              <p className="text-white/60 leading-relaxed">
                To create an AI assistant that actually helps — not by generating endless text, 
                but by taking real actions in the real world. We want to give everyone access to 
                the kind of support that used to be reserved for executives with personal assistants.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="text-4xl mb-6">🔮</div>
              <h2 className="text-2xl font-bold text-white mb-4">Our Vision</h2>
              <p className="text-white/60 leading-relaxed">
                A world where technology works FOR you, not the other way around. Where managing 
                your digital life is as simple as having a conversation. Where AI amplifies human 
                capability without compromising privacy or autonomy.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 sm:py-24">
          <h2 className="text-3xl font-bold text-white text-center mb-12">What we believe</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <div
                key={value.title}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 card-hover group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-3xl mb-4 transform transition-transform group-hover:scale-110">{value.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors">{value.title}</h3>
                <p className="text-white/70">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Story */}
        <section className="py-16 sm:py-24">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Our Story</h2>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 sm:p-12">
              <p className="text-white/70 leading-relaxed mb-6">
                Nova started with a simple frustration: why can&apos;t AI actually DO anything?
              </p>
              <p className="text-white/70 leading-relaxed mb-6">
                In 2024, we were watching the AI hype cycle reach fever pitch. ChatGPT could write essays, 
                generate code, and have surprisingly human conversations. But when you asked it to schedule 
                a meeting or turn off your lights? Nothing.
              </p>
              <p className="text-white/70 leading-relaxed mb-6">
                We believed AI could be more than a chatbot. It could be a bridge between intention and action. 
                You say &quot;schedule lunch with Sarah&quot; and it actually happens. You say &quot;movie night mode&quot; and 
                your home responds.
              </p>
              <p className="text-white/70 leading-relaxed">
                That&apos;s what we&apos;re building. Not AI that impresses you with words — AI that helps you with actions.
              </p>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-16 sm:py-24">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Journey</h2>
          <div className="max-w-2xl mx-auto">
            {timeline.map((item, index) => (
              <div key={index} className="flex gap-4 mb-8 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                  {index < timeline.length - 1 && (
                    <div className="w-0.5 h-full bg-white/10 mt-2" />
                  )}
                </div>
                <div className="pb-8">
                  <div className="text-violet-400 font-semibold mb-1">{item.year}</div>
                  <div className="text-white/80">{item.event}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="py-16 sm:py-24">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Meet the team</h2>
          <p className="text-white/70 text-center mb-12 max-w-2xl mx-auto">
            We&apos;re a small team of builders who believe AI can be genuinely helpful.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <div
                key={member.name}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center card-hover group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-4xl mx-auto mb-4 transition-transform group-hover:scale-110">
                  {member.avatar}
                </div>
                <h3 className="text-white font-semibold mb-1 group-hover:text-violet-300 transition-colors">{member.name}</h3>
                <p className="text-violet-400 text-sm mb-3">{member.role}</p>
                <p className="text-white/60 text-sm">{member.bio}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Join Us CTA */}
        <section className="py-16 sm:py-24">
          <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-white/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Join the journey</h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              We&apos;re always looking for talented people who want to build the future of AI. 
              Check out our open roles or just say hi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#"
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold transition-all btn-hover-lift"
              >
                View open roles
              </a>
              <a
                href="mailto:hello@heynova.se"
                className="px-6 py-3 border border-white/20 hover:bg-white/10 hover:border-white/30 rounded-full text-white font-semibold transition-all"
              >
                Get in touch
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-sm">✨</span>
            </div>
            <span className="text-white/60">© 2026 Nova AI. All rights reserved.</span>
          </div>
          <nav>
            <div className="flex flex-wrap gap-4 sm:gap-6 text-white/40 text-sm">
              <Link href="/" className="hover:text-white/60">Home</Link>
              <Link href="/blog" className="hover:text-white/60">Blog</Link>
              <Link href="/privacy" className="hover:text-white/60">Privacy</Link>
              <Link href="/terms" className="hover:text-white/60">Terms</Link>
              <Link href="/cookies" className="hover:text-white/60">Cookies</Link>
              <Link href="/contact" className="hover:text-white/60">Contact</Link>
              <Link href="/help" className="hover:text-white/60">Help</Link>
            </div>
          </nav>
        </div>
      </footer>
    </div>
  );
}
