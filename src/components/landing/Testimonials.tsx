'use client';

import { useState, useEffect } from 'react';

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Product Manager at Stripe',
    avatar: '👩🏻‍💼',
    content: "Nova has completely changed how I manage my day. I just tell it to 'schedule a meeting with the design team' and it handles everything — finding availability, sending invites, even adding agenda items.",
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Software Engineer',
    avatar: '👨🏿‍💻',
    content: "Finally, an AI that actually DOES things instead of just talking about them. I connected my smart home and now 'movie night mode' actually dims the lights and queues up my watchlist.",
    rating: 5,
  },
  {
    name: 'Emma Rodriguez',
    role: 'Freelance Designer',
    avatar: '👩🏽‍🎨',
    content: "As someone who's tried every AI assistant out there, Nova is different. It remembers context, learns my preferences, and the privacy-first approach gives me peace of mind.",
    rating: 5,
  },
  {
    name: 'David Park',
    role: 'Startup Founder',
    avatar: '👨🏻‍💼',
    content: "I was skeptical at first, but Nova saved me 3+ hours this week alone. Email triage, calendar management, even drafting responses — it's like having a personal executive assistant.",
    rating: 5,
  },
  {
    name: 'Lisa Thompson',
    role: 'Marketing Director',
    avatar: '👩🏼‍💻',
    content: "The integration with my smart home is seamless. 'Good morning' triggers my whole routine — coffee maker starts, blinds open, and I get my daily briefing. Pure magic.",
    rating: 5,
  },
  {
    name: 'James Wright',
    role: 'Remote Worker',
    avatar: '👨🏽',
    content: "What sets Nova apart is that it actually understands context. I can say 'remind me about that thing' and it knows exactly what I mean. No other AI does this.",
    rating: 5,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className={i < rating ? 'text-yellow-400' : 'text-white/20'}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24"
      aria-labelledby="testimonials-heading"
    >
      <div className="text-center mb-12">
        <h2
          id="testimonials-heading"
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          Loved by thousands
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          See what real users are saying about Nova
        </p>
      </div>

      {/* Desktop Grid */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {testimonials.map((testimonial, index) => (
          <article
            key={testimonial.name}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-2xl">
                {testimonial.avatar}
              </div>
              <div>
                <h3 className="text-white font-semibold">{testimonial.name}</h3>
                <p className="text-white/40 text-sm">{testimonial.role}</p>
              </div>
            </div>
            <StarRating rating={testimonial.rating} />
            <p className="text-white/70 mt-4 text-sm leading-relaxed">
              &ldquo;{testimonial.content}&rdquo;
            </p>
          </article>
        ))}
      </div>

      {/* Mobile Carousel */}
      <div className="md:hidden">
        <article className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-2xl">
              {testimonials[activeIndex].avatar}
            </div>
            <div>
              <h3 className="text-white font-semibold">
                {testimonials[activeIndex].name}
              </h3>
              <p className="text-white/40 text-sm">
                {testimonials[activeIndex].role}
              </p>
            </div>
          </div>
          <StarRating rating={testimonials[activeIndex].rating} />
          <p className="text-white/70 mt-4 text-sm leading-relaxed">
            &ldquo;{testimonials[activeIndex].content}&rdquo;
          </p>
        </article>

        {/* Carousel dots */}
        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === activeIndex
                  ? 'bg-violet-500 w-6'
                  : 'bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
