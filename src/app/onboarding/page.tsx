'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const common = useTranslations('common');
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleContinueToStep2 = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
    } catch (err) {
      console.error('Failed to save name:', err);
    } finally {
      setSaving(false);
      setStep(2);
    }
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
              <span className="text-3xl sm:text-4xl">{t('step1Emoji')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              {t('step1Title')}
            </h1>
            <p className="text-sm sm:text-base text-white/60 mb-6 sm:mb-8">
              {t('step1Subtitle')}
            </p>
            <label htmlFor="onboarding-name" className="sr-only">{t('yourName')}</label>
            <input
              id="onboarding-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('yourName')}
              className="w-full bg-white/10 border border-white/20 rounded-lg sm:rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-white text-center text-lg sm:text-xl placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4 sm:mb-6"
              autoFocus
              autoComplete="name"
            />
            <button
              onClick={handleContinueToStep2}
              disabled={!name.trim() || saving}
              className="w-full px-6 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg sm:rounded-xl text-white font-semibold text-base sm:text-lg transition-all"
            >
              {saving ? 'Saving...' : common('continue')}
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
              <span className="text-3xl sm:text-4xl">{t('step2Emoji')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              {t('step2Title', { name })}
            </h1>
            <p className="text-sm sm:text-base text-white/60 mb-6 sm:mb-8">
              {t('step2Subtitle')}
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 sm:mb-8">
              <p className="text-white/70 text-sm sm:text-base mb-4">
                Connect your favorite services to let Nova help with your calendar, email, music, and more.
              </p>
              <Link
                href="/integrations"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-all"
              >
                <span>🔗</span>
                Go to Integrations
              </Link>
            </div>
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 border border-white/20 hover:bg-white/10 rounded-lg sm:rounded-xl text-white text-sm sm:text-base font-medium transition-all"
              >
                {common('back')}
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg sm:rounded-xl text-white text-sm sm:text-base font-semibold transition-all"
              >
                {common('continue')}
              </button>
            </div>
            <p className="text-white/40 text-xs sm:text-sm mt-3 sm:mt-4">
              {t('addMoreLater')}
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
              <span className="text-3xl sm:text-4xl">{t('step3Emoji')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              {t('step3Title')}
            </h1>
            <p className="text-sm sm:text-base text-white/60 mb-6 sm:mb-8">
              {t('step3Subtitle')}
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 text-left">
              <h3 className="text-sm sm:text-base text-white font-medium mb-2 sm:mb-3">{t('tryAskingMe')}</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-white/60 text-sm">
                <li>{t('suggestions.calendar')}</li>
                <li>{t('suggestions.lights')}</li>
                <li>{t('suggestions.music')}</li>
                <li>{t('suggestions.reminder')}</li>
              </ul>
            </div>
            <Link
              href="/chat"
              className="block w-full px-6 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg sm:rounded-xl text-white font-semibold text-base sm:text-lg transition-all text-center"
            >
              {t('startChatting')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
