import Link from 'next/link';
import type { Metadata } from 'next';
import { PublicNav } from '@/components/PublicNav';
import { PublicFooter } from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'About Nova AI - Our Mission & Vision',
  description: 'Learn about Nova AI, our mission to make AI truly helpful, and the team building the future of personal AI assistants.',
  openGraph: {
    title: 'About Nova AI - Our Mission & Vision',
    description: 'Learn about Nova AI, our mission to make AI truly helpful, and the team building the future of personal AI assistants.',
  },
};

const team = [
  {
    name: 'Dorel',
    role: 'Founder',
    bio: 'Building the AI assistant that actually does things. Believes technology should work for people, not the other way around.',
    avatar: '👨‍💻',
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
  { year: '2026', event: 'Nova development started' },
  { year: '2026', event: 'Core chat + integrations built' },
  { year: '2026', event: 'Desktop app (macOS & Windows) ready' },
  { year: '2026', event: 'Preparing for public launch' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <PublicNav />

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
                AI chatbots can write essays and generate code, but when you ask them to schedule
                a meeting or check your email? They can&apos;t. There&apos;s a gap between conversation and action.
              </p>
              <p className="text-white/70 leading-relaxed">
                That&apos;s what we&apos;re building with Nova. An AI that connects to your real services — Google Calendar,
                Gmail, Spotify, Notion, Slack — and actually takes action. Not just talk, but real results.
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
          <div className="grid sm:grid-cols-1 md:grid-cols-1 gap-6 max-w-sm mx-auto">
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
      <PublicFooter />
    </div>
  );
}
