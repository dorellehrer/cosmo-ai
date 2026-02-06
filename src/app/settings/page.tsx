'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useVoiceSettings, SUPPORTED_LANGUAGES } from '@/contexts/VoiceSettingsContext';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const common = useTranslations('common');
  const { settings: voiceSettings, updateSettings: updateVoiceSettings } = useVoiceSettings();
  const [speechSupported, setSpeechSupported] = useState(true);

  // Check if speech recognition is supported
  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 
      (window.SpeechRecognition || (window as typeof window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
    setSpeechSupported(!!isSupported);
  }, []);
  
  const [integrations, setIntegrations] = useState([
    { id: 'google', icon: '📧', color: 'from-red-500 to-yellow-500', connected: false },
    { id: 'spotify', icon: '🎵', color: 'from-green-500 to-green-600', connected: false },
    { id: 'hue', icon: '💡', color: 'from-blue-500 to-purple-500', connected: false },
    { id: 'sonos', icon: '🔊', color: 'from-orange-500 to-red-500', connected: false },
    { id: 'notion', icon: '📝', color: 'from-gray-600 to-gray-800', connected: false },
    { id: 'slack', icon: '💬', color: 'from-purple-500 to-pink-500', connected: false },
  ]);
  const [name, setName] = useState('');

  const handleConnect = (id: string) => {
    // In real app, this would trigger OAuth flow
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: !i.connected } : i))
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link
            href="/chat"
            className="flex items-center gap-1 sm:gap-2 text-white/60 hover:text-white transition-colors"
            aria-label={t('backToChat')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="text-sm sm:text-base">{t('backToChat')}</span>
          </Link>
          <h1 className="text-lg sm:text-xl font-semibold text-white">{common('settings')}</h1>
          <div className="w-16 sm:w-20" aria-hidden="true" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Profile Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            {t('profile')}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xl sm:text-2xl shrink-0"
                aria-hidden="true"
              >
                {name ? name[0].toUpperCase() : '👤'}
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="name-input" className="sr-only">{t('yourName')}</label>
                <input
                  id="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('yourName')}
                  className="w-full bg-transparent text-lg sm:text-xl font-semibold text-white placeholder-white/40 focus:outline-none border-b border-transparent focus:border-violet-500 transition-colors truncate"
                />
                <p className="text-white/40 text-xs sm:text-sm mt-1">
                  {t('freePlan')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Language Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="language-heading">
          <h2 id="language-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            {t('language')}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <p className="text-white/60 text-sm mb-4">{t('languageDescription')}</p>
            <LanguageSwitcher variant="grid" />
          </div>
        </section>

        {/* Integrations Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="integrations-heading">
          <h2 id="integrations-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            {t('connectedServices')}
          </h2>
          <div 
            className="grid sm:grid-cols-2 gap-3 sm:gap-4"
            role="list"
            aria-label="Available integrations"
          >
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center justify-between"
                role="listitem"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center text-lg sm:text-xl shrink-0`}
                    aria-hidden="true"
                  >
                    {integration.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base text-white font-medium truncate">
                      {t(`integrations.${integration.id}.name`)}
                    </h3>
                    <p className="text-white/40 text-xs sm:text-sm truncate">
                      {t(`integrations.${integration.id}.description`)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleConnect(integration.id)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 ms-2 ${
                    integration.connected
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  aria-label={`${integration.connected ? t('connected') : t('connect')} ${t(`integrations.${integration.id}.name`)}`}
                  aria-pressed={integration.connected}
                >
                  {integration.connected ? t('connected') : t('connect')}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Voice Input Settings Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="voice-settings-heading">
          <h2 id="voice-settings-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-violet-400"
              aria-hidden="true"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            Voice Input
          </h2>
          
          {!speechSupported && (
            <div 
              className="mb-4 px-4 py-3 bg-amber-500/20 border border-amber-500/30 rounded-xl"
              role="alert"
            >
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-amber-400 shrink-0"
                  aria-hidden="true"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" x2="12" y1="9" y2="13" />
                  <line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
                <p className="text-sm text-amber-200">
                  Voice input is not supported in this browser. Try Chrome, Edge, or Safari.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl divide-y divide-white/10">
            {/* Auto-submit toggle */}
            <div className="p-3 sm:p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base text-white font-medium">Auto-submit</h3>
                <p className="text-white/40 text-xs sm:text-sm">
                  Automatically send message when you stop talking
                </p>
              </div>
              <button 
                onClick={() => updateVoiceSettings({ autoSubmit: !voiceSettings.autoSubmit })}
                className={`w-11 sm:w-12 h-6 sm:h-7 rounded-full relative transition-colors shrink-0 ${
                  voiceSettings.autoSubmit ? 'bg-violet-500' : 'bg-white/20'
                }`}
                role="switch"
                aria-checked={voiceSettings.autoSubmit}
                aria-label="Auto-submit voice input"
                disabled={!speechSupported}
              >
                <span 
                  className={`absolute top-0.5 sm:top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    voiceSettings.autoSubmit ? 'end-0.5 sm:end-1' : 'start-0.5 sm:start-1'
                  }`} 
                />
              </button>
            </div>

            {/* Auto-submit delay */}
            {voiceSettings.autoSubmit && (
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base text-white font-medium">Delay before submit</h3>
                    <p className="text-white/40 text-xs sm:text-sm">
                      Wait time after you stop speaking: {voiceSettings.autoSubmitDelay / 1000}s
                    </p>
                  </div>
                </div>
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="250"
                  value={voiceSettings.autoSubmitDelay}
                  onChange={(e) => updateVoiceSettings({ autoSubmitDelay: parseInt(e.target.value) })}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  aria-label="Auto-submit delay"
                  disabled={!speechSupported}
                />
                <div className="flex justify-between text-xs text-white/40 mt-1">
                  <span>0.5s</span>
                  <span>3s</span>
                </div>
              </div>
            )}

            {/* Language selection */}
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base text-white font-medium">Speech language</h3>
                  <p className="text-white/40 text-xs sm:text-sm">
                    Language for voice recognition
                  </p>
                </div>
                <select
                  value={voiceSettings.language}
                  onChange={(e) => updateVoiceSettings({ language: e.target.value })}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-[140px]"
                  aria-label="Speech language"
                  disabled={!speechSupported}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-slate-800">
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="preferences-heading">
          <h2 id="preferences-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            {t('preferences')}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl divide-y divide-white/10">
            <div className="p-3 sm:p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base text-white font-medium">{t('voiceResponses')}</h3>
                <p className="text-white/40 text-xs sm:text-sm">
                  {t('voiceDescription')}
                </p>
              </div>
              <button 
                className="w-11 sm:w-12 h-6 sm:h-7 bg-white/20 rounded-full relative transition-colors shrink-0"
                role="switch"
                aria-checked="false"
                aria-label={t('voiceResponses')}
              >
                <span className="absolute start-0.5 sm:start-1 top-0.5 sm:top-1 w-5 h-5 bg-white rounded-full transition-transform" />
              </button>
            </div>
            <div className="p-3 sm:p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base text-white font-medium">{t('notifications')}</h3>
                <p className="text-white/40 text-xs sm:text-sm">
                  {t('notificationsDescription')}
                </p>
              </div>
              <button 
                className="w-11 sm:w-12 h-6 sm:h-7 bg-violet-500 rounded-full relative transition-colors shrink-0"
                role="switch"
                aria-checked="true"
                aria-label={t('notifications')}
              >
                <span className="absolute end-0.5 sm:end-1 top-0.5 sm:top-1 w-5 h-5 bg-white rounded-full transition-transform" />
              </button>
            </div>
            <div className="p-3 sm:p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base text-white font-medium">{t('darkMode')}</h3>
                <p className="text-white/40 text-xs sm:text-sm">{t('darkModeDescription')}</p>
              </div>
              <button 
                className="w-11 sm:w-12 h-6 sm:h-7 bg-violet-500 rounded-full relative transition-colors cursor-not-allowed opacity-50 shrink-0"
                role="switch"
                aria-checked="true"
                aria-disabled="true"
                aria-label={t('darkMode')}
              >
                <span className="absolute end-0.5 sm:end-1 top-0.5 sm:top-1 w-5 h-5 bg-white rounded-full transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section aria-labelledby="danger-heading">
          <h2 id="danger-heading" className="text-base sm:text-lg font-semibold text-red-400 mb-3 sm:mb-4">
            {t('dangerZone')}
          </h2>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <h3 className="text-sm sm:text-base text-white font-medium mb-2">{t('deleteAccount')}</h3>
            <p className="text-white/40 text-xs sm:text-sm mb-3 sm:mb-4">
              {t('deleteAccountDescription')}
            </p>
            <button 
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-xs sm:text-sm font-medium transition-colors"
              aria-label={t('deleteMyAccount')}
            >
              {t('deleteMyAccount')}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
