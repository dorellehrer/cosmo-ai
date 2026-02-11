"use client";

import Link from "next/link";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Product Manager",
    avatar: "SM",
    quote:
      'I told Nova "schedule lunch with my team" and it actually checked everyone\'s calendars and created the event. First AI that goes beyond just answering questions.',
    gradient: "from-violet-500/30 to-fuchsia-500/30",
  },
  {
    name: "Alex Chen",
    role: "Software Engineer",
    avatar: "AC",
    quote:
      'The desktop app is a game-changer. "Find all TODO comments in src/" gives me instant results with file paths. It reads my actual codebase.',
    gradient: "from-blue-500/30 to-cyan-500/30",
  },
  {
    name: "Maria García",
    role: "Freelance Designer",
    avatar: "MG",
    quote:
      "Nova manages my client invoices. I say the hours and rate, and it calculates totals, drafts the email, and creates a follow-up reminder. Saves me hours weekly.",
    gradient: "from-pink-500/30 to-rose-500/30",
  },
  {
    name: "Johan Lindberg",
    role: "Smart Home Enthusiast",
    avatar: "JL",
    quote:
      '"Movie night" dims my Hue lights, pauses the music, and sends a text that it\'s starting. One sentence to orchestrate three different services.',
    gradient: "from-amber-500/30 to-orange-500/30",
  },
  {
    name: "Priya Sharma",
    role: "Operations Lead",
    avatar: "PS",
    quote:
      "Every Friday, Nova summarizes my week from Notion, drafts a status email, and posts it to Slack. My weekends start without admin work now.",
    gradient: "from-emerald-500/30 to-teal-500/30",
  },
  {
    name: "David Kim",
    role: "Startup Founder",
    avatar: "DK",
    quote:
      "The 5 intelligence levels are genius. I use the cheapest one for quick questions and only switch to Opus for complex strategy work. Pay for what you need.",
    gradient: "from-indigo-500/30 to-violet-500/30",
  },
];

const highlights = [
  {
    icon: "\u{1F4DE}",
    title: "Makes real phone calls",
    description:
      "Say \"call mom and tell her I'll be late\" \u2014 Nova dials, speaks naturally, and reports back.",
  },
  {
    icon: "\u{1F4E7}",
    title: "Reads your email",
    description:
      '"What did Johan email me about?" \u2192 Nova checks Gmail and summarizes.',
  },
  {
    icon: "\u{1F4BB}",
    title: "Controls your Mac",
    description:
      "Volume, brightness, files, apps, screenshots \u2014 all from chat.",
  },
  {
    icon: "\u{1F30D}",
    title: "10 languages",
    description: "English, Spanish, French, German, Japanese, and more.",
  },
];

export function Testimonials() {
  return (
    <section
      className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24"
      aria-labelledby="testimonials-heading"
    >
      {/* Section Header */}
      <div className="text-center mb-12 sm:mb-16">
        <span className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-4">
          Real people, real workflows
        </span>
        <h2
          id="testimonials-heading"
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          What people are saying
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Nova isn&apos;t just a chatbot &mdash; it takes action on your behalf
        </p>
      </div>

      {/* Testimonial Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-16">
        {testimonials.map((t, index) => (
          <article
            key={t.name}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6 hover:bg-white/10 transition-all animate-slide-up"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {/* Quote */}
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              &ldquo;{t.quote}&rdquo;
            </p>

            {/* Author */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-xs font-bold text-white`}
              >
                {t.avatar}
              </div>
              <div>
                <div className="text-white font-medium text-sm">{t.name}</div>
                <div className="text-white/40 text-xs">{t.role}</div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Highlights Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {highlights.map((h) => (
          <div key={h.title} className="text-center p-4">
            <div className="text-2xl mb-2">{h.icon}</div>
            <div className="text-white font-medium text-sm mb-1">{h.title}</div>
            <div className="text-white/40 text-xs">{h.description}</div>
          </div>
        ))}
      </div>

      {/* View More */}
      <div className="text-center mt-10">
        <Link
          href="/showcase"
          className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium text-sm transition-colors"
        >
          See all use cases
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="m9 18 6-6-6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </section>
  );
}
