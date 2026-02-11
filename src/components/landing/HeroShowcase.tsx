'use client';

import { useState, useEffect, useCallback } from 'react';

/* ─────────────────────────────────────────────
   Scenarios — each shows a user request + Nova's
   multi-step action chain + final result
   ───────────────────────────────────────────── */
type Step = {
  icon: string;
  label: string;
};

type Scenario = {
  id: string;
  tab: string;
  tabIcon: string;
  userMessage: string;
  steps: Step[];
  result: string;
  resultIcon: string;
};

const scenarios: Scenario[] = [
  {
    id: 'email',
    tab: 'Email & Calendar',
    tabIcon: '📧',
    userMessage: '"Check my email from Johan and add whatever he suggested to my calendar"',
    steps: [
      { icon: '📨', label: 'Searching Gmail…' },
      { icon: '📅', label: 'Creating calendar event…' },
      { icon: '✉️', label: 'Sending confirmation…' },
    ],
    result: 'Done! Found Johan\'s email about dinner at 7pm. Created "Dinner with Johan" on your calendar and sent him a WhatsApp confirming you\'ll be there.',
    resultIcon: '✅',
  },
  {
    id: 'phone',
    tab: 'AI Phone Call',
    tabIcon: '📞',
    userMessage: '"Call mom and tell her I\'ll be 30 minutes late for dinner"',
    steps: [
      { icon: '📱', label: 'Dialing Mom…' },
      { icon: '🗣️', label: 'Speaking with Mom…' },
      { icon: '📝', label: 'Writing call summary…' },
    ],
    result: 'Call completed (1m 23s). Your mom said no problem — she\'ll push dinner to 7:30. She also asked if you could pick up milk on the way.',
    resultIcon: '📞',
  },
  {
    id: 'research',
    tab: 'Web Research',
    tabIcon: '🔍',
    userMessage: '"Find me the best restaurants near Stureplan and book one for tonight"',
    steps: [
      { icon: '🌐', label: 'Searching the web…' },
      { icon: '⭐', label: 'Comparing ratings…' },
      { icon: '📅', label: 'Adding to calendar…' },
    ],
    result: 'Found 3 top-rated restaurants near Stureplan. Riche has a table at 8pm tonight — I\'ve added it to your calendar with the address and confirmation number.',
    resultIcon: '🍽️',
  },
  {
    id: 'creative',
    tab: 'Create & Generate',
    tabIcon: '🎨',
    userMessage: '"Generate a birthday invitation for Saturday and send it to my team on Slack"',
    steps: [
      { icon: '🎨', label: 'Generating image…' },
      { icon: '✍️', label: 'Writing invitation…' },
      { icon: '💬', label: 'Posting to Slack…' },
    ],
    result: 'Done! Created a fun birthday invitation with a custom illustration. Posted it to #general on Slack with the party details — Saturday 6pm at your place.',
    resultIcon: '🎉',
  },
];

const STEP_DURATION = 1200;
const RESULT_PAUSE = 4000;
const AUTO_CYCLE_DELAY = STEP_DURATION * 3 + RESULT_PAUSE + 800;

export function HeroShowcase() {
  const [activeScenario, setActiveScenario] = useState(0);
  const [currentStep, setCurrentStep] = useState(-1); // -1 = showing user msg, 0-2 = steps, 3 = result
  const [isPaused, setIsPaused] = useState(false);

  const scenario = scenarios[activeScenario];

  const resetAndPlay = useCallback((index: number) => {
    setActiveScenario(index);
    setCurrentStep(-1);
  }, []);

  // Step through the animation
  useEffect(() => {
    if (isPaused && currentStep >= scenario.steps.length) return;

    const stepCount = scenario.steps.length;

    if (currentStep < stepCount) {
      const delay = currentStep === -1 ? 800 : STEP_DURATION;
      const timer = setTimeout(() => setCurrentStep((s) => s + 1), delay);
      return () => clearTimeout(timer);
    }

    // After result is shown, auto-advance to next scenario
    if (!isPaused) {
      const timer = setTimeout(() => {
        resetAndPlay((activeScenario + 1) % scenarios.length);
      }, RESULT_PAUSE);
      return () => clearTimeout(timer);
    }
  }, [currentStep, activeScenario, isPaused, scenario.steps.length, resetAndPlay]);

  const handleTabClick = (index: number) => {
    setIsPaused(true);
    resetAndPlay(index);
  };

  return (
    <div
      className="w-full max-w-3xl mx-auto mt-10 sm:mt-14"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Scenario tabs */}
      <div className="flex gap-1 sm:gap-2 mb-0 overflow-x-auto scrollbar-none px-1">
        {scenarios.map((s, i) => (
          <button
            key={s.id}
            onClick={() => handleTabClick(i)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              i === activeScenario
                ? 'bg-white/10 text-white border border-white/10 border-b-0'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <span>{s.tabIcon}</span>
            <span className="hidden sm:inline">{s.tab}</span>
          </button>
        ))}
      </div>

      {/* Showcase card — FIXED HEIGHT to prevent layout shift */}
      <div className="bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-2xl rounded-tl-none overflow-hidden" style={{ minHeight: '320px' }}>
        {/* User message */}
        <div className="px-5 sm:px-8 pt-6 sm:pt-8">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
              <span className="text-sm">👤</span>
            </div>
            <div>
              <p className="text-white/50 text-xs mb-1">You</p>
              <p className="text-white text-sm sm:text-base italic leading-relaxed">
                {scenario.userMessage}
              </p>
            </div>
          </div>
        </div>

        {/* Nova's action chain */}
        <div className="px-5 sm:px-8 pt-5 pb-6 sm:pb-8">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-violet-400/30 flex items-center justify-center shrink-0">
              <span className="text-sm">✨</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/50 text-xs mb-3">Nova</p>

              {/* Steps */}
              <div className="space-y-2.5 mb-4" style={{ minHeight: '108px' }}>
                {scenario.steps.map((step, i) => {
                  const isActive = currentStep === i;
                  const isDone = currentStep > i;
                  const isVisible = currentStep >= i;

                  return (
                    <div
                      key={`${scenario.id}-${i}`}
                      className={`flex items-center gap-2.5 transition-all duration-300 ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                    >
                      {isDone ? (
                        <span className="text-green-400 text-sm">✓</span>
                      ) : isActive ? (
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
                        </span>
                      ) : (
                        <span className="text-sm opacity-50">{step.icon}</span>
                      )}
                      <span
                        className={`text-sm transition-colors duration-200 ${
                          isDone
                            ? 'text-white/40 line-through'
                            : isActive
                              ? 'text-violet-300'
                              : 'text-white/30'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Result */}
              <div
                className={`transition-all duration-500 ${
                  currentStep >= scenario.steps.length
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-3'
                }`}
                style={{ minHeight: '72px' }}
              >
                {currentStep >= scenario.steps.length && (
                  <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-400/20 rounded-xl px-4 py-3">
                    <p className="text-white/90 text-sm leading-relaxed">
                      <span className="mr-1.5">{scenario.resultIcon}</span>
                      {scenario.result}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {scenarios.map((_, i) => (
          <button
            key={i}
            onClick={() => handleTabClick(i)}
            className={`transition-all duration-300 rounded-full ${
              i === activeScenario
                ? 'w-6 h-2 bg-gradient-to-r from-violet-400 to-fuchsia-400'
                : 'w-2 h-2 bg-white/20 hover:bg-white/40'
            }`}
            aria-label={`Show scenario ${i + 1}`}
          />
        ))}
        <span className="text-white/30 text-xs ml-3">
          {isPaused ? 'Paused' : 'Auto-playing'}
        </span>
      </div>
    </div>
  );
}
