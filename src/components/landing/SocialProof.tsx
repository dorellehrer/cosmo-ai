'use client';

import { useEffect, useState } from 'react';

function AnimatedCounter({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
}

const stats = [
  { value: 47000, suffix: '+', label: 'Active users' },
  { value: 2, suffix: 'M+', label: 'Messages sent', displayValue: 2000000 },
  { value: 150, suffix: '+', label: 'Integrations' },
  { value: 4.9, suffix: '/5', label: 'User rating', isDecimal: true },
];

export function SocialProof() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-2">
              {stat.isDecimal ? (
                stat.value
              ) : (
                <AnimatedCounter end={stat.displayValue || stat.value} />
              )}
              {stat.suffix}
            </div>
            <div className="text-white/60 text-sm sm:text-base">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Logos / Featured in */}
      <div className="mt-12 pt-12 border-t border-white/10">
        <p className="text-center text-white/40 text-sm uppercase tracking-wider mb-8">
          Featured in
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 text-white/30 text-lg sm:text-xl font-semibold">
          <span className="hover:text-white/50 transition-colors">TechCrunch</span>
          <span className="hover:text-white/50 transition-colors">Product Hunt</span>
          <span className="hover:text-white/50 transition-colors">Wired</span>
          <span className="hover:text-white/50 transition-colors">The Verge</span>
          <span className="hover:text-white/50 transition-colors">Hacker News</span>
        </div>
      </div>
    </section>
  );
}
