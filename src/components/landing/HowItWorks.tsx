'use client';

const steps = [
  {
    number: '01',
    title: 'Sign up in seconds',
    description: 'Create your free account. No credit card required, no complicated setup.',
    icon: '✨',
  },
  {
    number: '02',
    title: 'Connect your services',
    description: 'Link your email, calendar, smart home devices — whatever you want Nova to help with.',
    icon: '🔗',
  },
  {
    number: '03',
    title: 'Start chatting naturally',
    description: 'Just tell Nova what you need. "Check my emails" or "Schedule lunch with Sarah tomorrow."',
    icon: '💬',
  },
  {
    number: '04',
    title: 'Watch Nova work',
    description: 'Nova takes action and keeps you informed. It learns your preferences over time.',
    icon: '🚀',
  },
];

export function HowItWorks() {
  return (
    <section
      className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24"
      aria-labelledby="how-it-works-heading"
    >
      <div className="text-center mb-12 sm:mb-16">
        <h2
          id="how-it-works-heading"
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          How it works
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Get started with Nova in under 2 minutes
        </p>
      </div>

      <div className="relative">
        {/* Connection line (desktop only) */}
        <div className="hidden md:block absolute top-24 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-violet-500/50 via-fuchsia-500/50 to-violet-500/50" />

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative text-center animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Step circle */}
              <div className="relative mx-auto mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/25">
                  <span className="text-3xl">{step.icon}</span>
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-900 border-2 border-violet-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-violet-400">{step.number}</span>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
