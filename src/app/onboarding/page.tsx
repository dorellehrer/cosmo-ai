'use client';

import { useState } from 'react';
import Link from 'next/link';

const INTEGRATIONS = [
  {
    id: 'google',
    name: 'Google',
    icon: '📧',
    description: 'Calendar, Gmail, Drive',
    connected: false,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🎵',
    description: 'Music control',
    connected: false,
  },
  {
    id: 'hue',
    name: 'Philips Hue',
    icon: '💡',
    description: 'Smart lights',
    connected: false,
  },
  {
    id: 'sonos',
    name: 'Sonos',
    icon: '🔊',
    description: 'Speakers',
    connected: false,
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [integrations, setIntegrations] = useState(INTEGRATIONS);

  const toggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: !i.connected } : i))
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full">
        {/* Progress indicator */}
        <nav 
          className="flex justify-center gap-2 mb-6 sm:mb-8"
          role="navigation"
          aria-label="Onboarding progress"
        >
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 sm:h-3 rounded-full transition-all ${
                s === step
                  ? 'bg-violet-500 w-6 sm:w-8'
                  : s < step
                    ? 'bg-violet-500 w-2 sm:w-3'
                    : 'bg-white/20 w-2 sm:w-3'
              }`}
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={3}
              aria-label={`Step ${s} of 3${s === step ? ' (current)' : s < step ? ' (completed)' : ''}`}
            />
          ))}
        </nav>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="text-center animate-fade-in">
            <div 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-4 sm:mb-6"
              aria-hidden="true"
            >
              <span className="text-3xl sm:text-4xl">👋</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Hey there! I&apos;m Cosmo
            </h1>
            <p className="text-sm sm:text-base text-white/60 mb-6 sm:mb-8">
              What should I call you?
            </p>
            <label htmlFor="onboarding-name" className="sr-only">Your name</label>
            <input
              id="onboarding-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-white/10 border border-white/20 rounded-lg sm:rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-white text-center text-lg sm:text-xl placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4 sm:mb-6"
              autoFocus
              autoComplete="name"
            />
            <button
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="w-full px-6 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg sm:rounded-xl text-white font-semibold text-base sm:text-lg transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Integrations */}
        {step === 2 && (
          <div className="text-center animate-fade-in">
            <div 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-4 sm:mb-6"
              aria-hidden="true"
            >
              <span className="text-3xl sm:text-4xl">🔌</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Nice to meet you, {name}!
            </h1>
            <p className="text-sm sm:text-base text-white/60 mb-6 sm:mb-8">
              What would you like me to help with?
            </p>
            <div 
              className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8"
              role="group"
              aria-label="Select integrations to connect"
            >
              {integrations.map((integration) => (
                <button
                  key={integration.id}
                  onClick={() => toggleIntegration(integration.id)}
                  className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all text-left ${
                    integration.connected
                      ? 'bg-violet-500/20 border-violet-500'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  aria-pressed={integration.connected}
                  aria-label={`${integration.name}: ${integration.description}`}
                >
                  <span className="text-xl sm:text-2xl" aria-hidden="true">{integration.icon}</span>
                  <h3 className="text-sm sm:text-base text-white font-medium mt-1.5 sm:mt-2">
                    {integration.name}
                  </h3>
                  <p className="text-white/40 text-xs sm:text-sm">
                    {integration.description}
                  </p>
                </button>
              ))}
            </div>
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 border border-white/20 hover:bg-white/10 rounded-lg sm:rounded-xl text-white text-sm sm:text-base font-medium transition-all"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg sm:rounded-xl text-white text-sm sm:text-base font-semibold transition-all"
              >
                Continue
              </button>
            </div>
            <p className="text-white/40 text-xs sm:text-sm mt-3 sm:mt-4">
              You can always add more later
            </p>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className="text-center animate-fade-in">
            <div 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-4 sm:mb-6"
              aria-hidden="true"
            >
              <span className="text-3xl sm:text-4xl">🚀</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              You&apos;re all set!
            </h1>
            <p className="text-sm sm:text-base text-white/60 mb-6 sm:mb-8">
              I&apos;m ready to help you with anything. Let&apos;s get started!
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 text-left">
              <h3 className="text-sm sm:text-base text-white font-medium mb-2 sm:mb-3">Try asking me:</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-white/60 text-sm">
                <li>&quot;What&apos;s on my calendar today?&quot;</li>
                <li>&quot;Turn on the living room lights&quot;</li>
                <li>&quot;Play some chill music&quot;</li>
                <li>&quot;Remind me to call mom at 5pm&quot;</li>
              </ul>
            </div>
            <Link
              href="/chat"
              className="block w-full px-6 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg sm:rounded-xl text-white font-semibold text-base sm:text-lg transition-all text-center"
            >
              Start chatting with Cosmo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
