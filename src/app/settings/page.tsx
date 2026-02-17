'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useVoiceSettings, SUPPORTED_LANGUAGES } from '@/contexts/VoiceSettingsContext';
import { useIntegrations } from '@/contexts/IntegrationsContext';
import { NotificationBell } from '@/components/notifications';
import { MODEL_LIST, REASONING_LEVELS } from '@/lib/ai/models';
import type { ReasoningLevel } from '@/lib/ai/models';
import { useCapabilities } from '@/hooks/useCapabilities';

// Integration icons mapping
const INTEGRATION_ICONS: Record<string, React.ReactNode> = {
  google: (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  hue: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 2C9.24 2 7 4.24 7 7v5h10V7c0-2.76-2.24-5-5-5zM9 7c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V7zm-2 7v5c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-5H7zm5 5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
    </svg>
  ),
  spotify: (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  ),
  sonos: (
    <span className="text-[10px] font-bold tracking-wider">SONOS</span>
  ),
  notion: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933l3.222-.187zM2.877.466L16.082-.28c1.634-.14 2.055.047 2.755.56l3.783 2.66c.513.374.7.467.7 1.026v17.957c0 1.121-.42 1.775-1.869 1.868l-15.457.933c-1.075.047-1.588-.093-2.149-.793L1.1 20.264c-.513-.654-.747-1.12-.747-1.774V2.147c0-.84.42-1.54 1.524-1.68z"/>
    </svg>
  ),
  slack: (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
      <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
      <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
      <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  ),
};

export default function SettingsPage() {
  type TrustMode = 'owner_only' | 'allowlist' | 'open';
  type TrustedContact = {
    id: string;
    channelType: string;
    identifier: string;
    label: string | null;
    isOwner: boolean;
    createdAt: string;
    updatedAt: string;
  };

  const t = useTranslations('settings');
  const common = useTranslations('common');
  const router = useRouter();
  const { settings: voiceSettings, updateSettings: updateVoiceSettings } = useVoiceSettings();
  const { integrations, disconnectIntegration, connectedCount } = useIntegrations();
  const { isDesktop } = useCapabilities();
  // Check if speech recognition is supported using lazy initial state
  const [speechSupported] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !!(window.SpeechRecognition || (window as typeof window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
  });
  const [name, setName] = useState('');
  const [userIsPro, setUserIsPro] = useState(false);
  const [preferredModel, setPreferredModel] = useState(MODEL_LIST[0]?.id || 'gpt-5-mini');
  const [userCredits, setUserCredits] = useState(0);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningLevel>('low');
  const [savingReasoning, setSavingReasoning] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [nameTimeout, setNameTimeout] = useState<NodeJS.Timeout | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [voiceResponses, setVoiceResponses] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('nova-voice-responses') === 'true';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('nova-notifications-enabled') !== 'false';
  });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [savingSystemPrompt, setSavingSystemPrompt] = useState(false);
  const [systemPromptTimeout, setSystemPromptTimeout] = useState<NodeJS.Timeout | null>(null);
  const [trustMode, setTrustMode] = useState<TrustMode>('allowlist');
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [loadingTrust, setLoadingTrust] = useState(true);
  const [savingTrustMode, setSavingTrustMode] = useState(false);
  const [addingTrustedContact, setAddingTrustedContact] = useState(false);
  const [deletingTrustedContactId, setDeletingTrustedContactId] = useState<string | null>(null);
  const [contactChannelType, setContactChannelType] = useState('whatsapp');
  const [contactIdentifier, setContactIdentifier] = useState('');
  const [contactLabel, setContactLabel] = useState('');
  const [contactIsOwner, setContactIsOwner] = useState(false);

  // Load profile from API
  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.name) setName(data.name);
        if (data.isPro !== undefined) setUserIsPro(data.isPro);
        if (data.preferredModel) setPreferredModel(data.preferredModel);
        if (data.systemPrompt) setSystemPrompt(data.systemPrompt);
        if (data.credits !== undefined) setUserCredits(data.credits);
        if (data.reasoningEffort) setReasoningEffort(data.reasoningEffort as ReasoningLevel);
      })
      .catch((err) => console.error('Failed to load profile:', err))
      .finally(() => setProfileLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/agent/trust')
      .then((res) => res.json())
      .then((data) => {
        if (data?.mode) setTrustMode(data.mode as TrustMode);
        if (Array.isArray(data?.contacts)) setTrustedContacts(data.contacts as TrustedContact[]);
      })
      .catch((err) => console.error('Failed to load trust policy:', err))
      .finally(() => setLoadingTrust(false));
  }, []);

  // Auto-save name with debounce
  const saveName = useCallback(
    (value: string) => {
      if (nameTimeout) clearTimeout(nameTimeout);
      const timeout = setTimeout(async () => {
        if (!value.trim()) return;
        setSavingName(true);
        try {
          await fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: value.trim() }),
          });
        } catch (err) {
          console.error('Failed to save name:', err);
        } finally {
          setSavingName(false);
        }
      }, 800);
      setNameTimeout(timeout);
    },
    [nameTimeout]
  );

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    saveName(value);
  };

  const saveSystemPrompt = useCallback(
    (value: string) => {
      if (systemPromptTimeout) clearTimeout(systemPromptTimeout);
      const timeout = setTimeout(async () => {
        setSavingSystemPrompt(true);
        try {
          await fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt: value }),
          });
        } catch (err) {
          console.error('Failed to save system prompt:', err);
        } finally {
          setSavingSystemPrompt(false);
        }
      }, 800);
      setSystemPromptTimeout(timeout);
    },
    [systemPromptTimeout]
  );

  const handleSystemPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length > 1000) return;
    setSystemPrompt(value);
    saveSystemPrompt(value);
  };

  const toggleVoiceResponses = () => {
    const next = !voiceResponses;
    setVoiceResponses(next);
    localStorage.setItem('nova-voice-responses', String(next));
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' });
      if (res.ok) {
        await signOut({ redirect: false });
        router.push('/');
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const handleDisconnect = (id: string) => {
    setDisconnectingId(id);
    setTimeout(() => {
      disconnectIntegration(id);
      setDisconnectingId(null);
    }, 300);
  };

  const handleModelChange = async (modelId: string) => {
    setPreferredModel(modelId);
    setSavingModel(true);
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredModel: modelId }),
      });
    } catch (err) {
      console.error('Failed to save model:', err);
    } finally {
      setSavingModel(false);
    }
  };

  const updateTrustMode = async (nextMode: TrustMode) => {
    setTrustMode(nextMode);
    setSavingTrustMode(true);
    try {
      const res = await fetch('/api/agent/trust', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: nextMode }),
      });

      if (!res.ok) {
        throw new Error('Failed to save trust mode');
      }
    } catch (err) {
      console.error('Failed to save trust mode:', err);
    } finally {
      setSavingTrustMode(false);
    }
  };

  const handleAddTrustedContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const identifier = contactIdentifier.trim();
    if (!identifier) return;

    setAddingTrustedContact(true);
    try {
      const res = await fetch('/api/agent/trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelType: contactChannelType,
          identifier,
          label: contactLabel.trim() || null,
          isOwner: contactIsOwner,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to add trusted contact');
      }

      const data = await res.json();
      if (data?.contact) {
        const next = data.contact as TrustedContact;
        setTrustedContacts((prev) => {
          const withoutExisting = prev.filter((contact) => contact.id !== next.id);
          return [next, ...withoutExisting];
        });
      }

      setContactIdentifier('');
      setContactLabel('');
      setContactIsOwner(false);
    } catch (err) {
      console.error('Failed to add trusted contact:', err);
    } finally {
      setAddingTrustedContact(false);
    }
  };

  const handleDeleteTrustedContact = async (id: string) => {
    setDeletingTrustedContactId(id);
    try {
      const res = await fetch(`/api/agent/trust/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete trusted contact');
      }
      setTrustedContacts((prev) => prev.filter((contact) => contact.id !== id));
    } catch (err) {
      console.error('Failed to delete trusted contact:', err);
    } finally {
      setDeletingTrustedContactId(null);
    }
  };



  const connectedIntegrations = integrations.filter((i) => i.connected);

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
          <NotificationBell />
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
                  onChange={handleNameChange}
                  placeholder={profileLoading ? 'Loading...' : t('yourName')}
                  disabled={profileLoading}
                  className="w-full bg-transparent text-lg sm:text-xl font-semibold text-white placeholder-white/40 focus:outline-none border-b border-transparent focus:border-violet-500 transition-colors truncate disabled:opacity-50"
                />
                <p className="text-white/40 text-xs sm:text-sm mt-1">
                  {savingName ? 'Saving...' : userIsPro ? t('proPlan') ?? 'Pro Plan' : `${userCredits} credits remaining`}
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

        {/* AI Model Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="model-heading">
          <h2 id="model-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400" aria-hidden="true">
              <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/>
              <circle cx="12" cy="15" r="2"/>
            </svg>
            Intelligence Level
            {savingModel && <span className="text-xs text-white/40 font-normal">Saving...</span>}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            {/* Credit balance banner */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M20 12a8 8 0 01-8 8m8-8a8 8 0 00-8-8m8 8h-8m0 8a8 8 0 01-8-8m8 8v-8m-8 0a8 8 0 018-8m-8 8h8m0-8v8" strokeWidth="1.5"/></svg>
                <span className="text-white/60 text-sm">Your credits</span>
                <span className={`text-lg font-bold tabular-nums ${userCredits > 10 ? 'text-white' : userCredits > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                  {userCredits}
                </span>
              </div>
              <Link
                href="/pricing"
                className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
              >
                Buy credits
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </Link>
            </div>

            <p className="text-white/60 text-sm mb-4">Choose the intelligence level Nova uses for conversations. Higher levels cost more credits per message.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {MODEL_LIST.map((model) => {
                const canAfford = model.creditCost === 0 || userCredits >= model.creditCost;
                return (
                  <button
                    key={model.id}
                    onClick={() => handleModelChange(model.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      preferredModel === model.id
                        ? 'bg-violet-500/20 border-violet-500/50'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{model.icon} {model.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        model.creditCost === 0
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : canAfford
                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {model.costLabel}
                      </span>
                    </div>
                    <p className="text-xs text-white/40">{model.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Reasoning Effort Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="reasoning-heading">
          <h2 id="reasoning-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Thinking Depth
            {savingReasoning && <span className="text-xs text-white/40 font-normal">Saving...</span>}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <p className="text-white/60 text-sm mb-4">
              Controls how deeply the AI reasons before responding. Higher depth produces more thoughtful answers but takes longer. Applies to Advanced and Genius models.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {REASONING_LEVELS.map((level) => {
                const configs = {
                  low: { label: 'Quick', desc: 'Fast responses, light reasoning', color: 'green', icon: '⚡' },
                  medium: { label: 'Balanced', desc: 'Good mix of speed and depth', color: 'amber', icon: '🧠' },
                  high: { label: 'Deep', desc: 'Maximum reasoning, slower', color: 'red', icon: '💡' },
                };
                const cfg = configs[level];
                return (
                  <button
                    key={level}
                    onClick={async () => {
                      setReasoningEffort(level);
                      setSavingReasoning(true);
                      try {
                        await fetch('/api/user/profile', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reasoningEffort: level }),
                        });
                      } catch (err) {
                        console.error('Failed to save reasoning:', err);
                      } finally {
                        setSavingReasoning(false);
                      }
                    }}
                    className={`text-center p-4 rounded-xl border transition-all ${
                      reasoningEffort === level
                        ? `bg-${cfg.color}-500/20 border-${cfg.color}-500/50 ring-1 ring-${cfg.color}-500/30`
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="text-2xl mb-2">{cfg.icon}</div>
                    <div className={`text-sm font-medium ${reasoningEffort === level ? 'text-white' : 'text-white/70'}`}>
                      {cfg.label}
                    </div>
                    <div className="text-[11px] text-white/40 mt-1">{cfg.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* System Prompt Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="system-prompt-heading">
          <h2 id="system-prompt-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400" aria-hidden="true">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" x2="8" y1="13" y2="13"/>
              <line x1="16" x2="8" y1="17" y2="17"/>
              <line x1="10" x2="8" y1="9" y2="9"/>
            </svg>
            {t('systemPrompt')}
            {savingSystemPrompt && <span className="text-xs text-white/40 font-normal">Saving...</span>}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <p className="text-white/60 text-sm mb-3">{t('systemPromptDescription')}</p>
            <textarea
              value={systemPrompt}
              onChange={handleSystemPromptChange}
              placeholder={t('systemPromptPlaceholder')}
              disabled={profileLoading}
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none transition-colors disabled:opacity-50"
            />
            <p className="text-white/30 text-xs mt-2 text-right">
              {systemPrompt.length}/1000 {t('systemPromptChars')}
            </p>
          </div>
        </section>

        {/* Connected Integrations Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="integrations-heading">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 id="integrations-heading" className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              {t('connectedServices')}
              {connectedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium">
                  {connectedCount}
                </span>
              )}
            </h2>
            <Link
              href="/integrations"
              className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors"
            >
              Manage all
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
          </div>

          {connectedIntegrations.length > 0 ? (
            <div 
              className="grid sm:grid-cols-2 gap-3 sm:gap-4"
              role="list"
              aria-label="Connected integrations"
            >
              {connectedIntegrations.map((integration) => (
                <div
                  key={integration.id}
                  className={`bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all duration-300 ${
                    disconnectingId === integration.id ? 'opacity-50 scale-95' : ''
                  }`}
                  role="listitem"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center shrink-0`}
                        aria-hidden="true"
                      >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-slate-900/50 flex items-center justify-center text-white">
                          {INTEGRATION_ICONS[integration.id]}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base text-white font-medium truncate">
                          {integration.name}
                        </h3>
                        <p className="text-white/40 text-xs sm:text-sm truncate">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium shrink-0">
                      {t('connected')}
                    </span>
                  </div>
                  
                  {/* Connection info */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    {integration.email && (
                      <p className="text-white/40 text-xs truncate flex-1">
                        {integration.email}
                      </p>
                    )}
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors shrink-0 ms-2"
                      disabled={disconnectingId === integration.id}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 border-dashed rounded-xl sm:rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                  <path d="M12 22v-5"/>
                  <path d="M9 8V2"/>
                  <path d="M15 8V2"/>
                  <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>
                  <path d="M3 8h18"/>
                </svg>
              </div>
              <h3 className="text-white font-medium mb-2">No integrations connected</h3>
              <p className="text-white/40 text-sm mb-4">
                Connect your apps to let Nova help you more
              </p>
              <Link
                href="/integrations"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Browse integrations
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </Link>
            </div>
          )}
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
        <section className="mb-8 sm:mb-12" aria-labelledby="channel-trust-heading">
          <h2 id="channel-trust-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400" aria-hidden="true">
              <path d="M20 13c0 5-3.5 7-8 7s-8-2-8-7a8 8 0 1 1 16 0Z"/>
              <path d="M12 10v4"/>
              <path d="M10 12h4"/>
            </svg>
            {t('channelTrust')}
            {savingTrustMode && <span className="text-xs text-white/40 font-normal">{common('loading')}</span>}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <p className="text-white/60 text-sm mb-4">{t('channelTrustDescription')}</p>
            <div className="grid sm:grid-cols-3 gap-2 mb-5">
              {(['owner_only', 'allowlist', 'open'] as TrustMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateTrustMode(mode)}
                  className={`text-sm rounded-lg border px-3 py-2 transition-colors ${
                    trustMode === mode
                      ? 'bg-violet-500/20 border-violet-500/50 text-white'
                      : 'bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/5 hover:border-white/20'
                  }`}
                  disabled={loadingTrust || savingTrustMode}
                >
                  {mode === 'owner_only' && t('channelTrustOwnerOnly')}
                  {mode === 'allowlist' && t('channelTrustAllowlist')}
                  {mode === 'open' && t('channelTrustOpen')}
                </button>
              ))}
            </div>

            <form onSubmit={handleAddTrustedContact} className="grid sm:grid-cols-4 gap-2 mb-4">
              <select
                value={contactChannelType}
                onChange={(e) => setContactChannelType(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                aria-label={t('channelType')}
              >
                <option value="whatsapp" className="bg-slate-800">WhatsApp</option>
                <option value="telegram" className="bg-slate-800">Telegram</option>
                <option value="discord" className="bg-slate-800">Discord</option>
                <option value="slack" className="bg-slate-800">Slack</option>
                <option value="sms" className="bg-slate-800">SMS</option>
                <option value="email" className="bg-slate-800">Email</option>
              </select>
              <input
                type="text"
                value={contactIdentifier}
                onChange={(e) => setContactIdentifier(e.target.value)}
                placeholder={t('trustedIdentifierPlaceholder')}
                className="sm:col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input
                type="text"
                value={contactLabel}
                onChange={(e) => setContactLabel(e.target.value)}
                placeholder={t('trustedLabelPlaceholder')}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <label className="sm:col-span-3 inline-flex items-center gap-2 text-xs text-white/70 mt-1">
                <input
                  type="checkbox"
                  checked={contactIsOwner}
                  onChange={(e) => setContactIsOwner(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-violet-500 focus:ring-violet-500"
                />
                {t('trustedMarkOwner')}
              </label>
              <button
                type="submit"
                disabled={addingTrustedContact || !contactIdentifier.trim()}
                className="sm:col-span-1 px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {addingTrustedContact ? common('loading') : t('addTrustedContact')}
              </button>
            </form>

            <div className="space-y-2">
              {trustedContacts.length === 0 ? (
                <p className="text-white/40 text-sm">{t('noTrustedContacts')}</p>
              ) : (
                trustedContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {contact.channelType}: {contact.identifier}
                      </p>
                      <p className="text-xs text-white/40 truncate">
                        {contact.label || t('noLabel')}
                        {contact.isOwner ? ` • ${t('ownerBadge')}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTrustedContact(contact.id)}
                      disabled={deletingTrustedContactId === contact.id}
                      className="px-2.5 py-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {deletingTrustedContactId === contact.id ? common('loading') : common('delete')}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/60 flex flex-wrap items-center gap-2">
              <span>{t('channelTrust')}:</span>
              <span className="px-1.5 py-0.5 rounded border border-white/20 text-white/80">
                {trustMode === 'owner_only' && t('channelTrustOwnerOnly')}
                {trustMode === 'allowlist' && t('channelTrustAllowlist')}
                {trustMode === 'open' && t('channelTrustOpen')}
              </span>
              <span>•</span>
              <span>{trustedContacts.length}</span>
              <span>/</span>
              <span>{trustedContacts.filter((contact) => contact.isOwner).length}</span>
              <span>•</span>
              <span>{t('ownerBadge').toLowerCase()}</span>
            </div>
          </div>
        </section>

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
                onClick={toggleVoiceResponses}
                className={`w-11 sm:w-12 h-6 sm:h-7 rounded-full relative transition-colors shrink-0 ${
                  voiceResponses ? 'bg-violet-500' : 'bg-white/20'
                }`}
                role="switch"
                aria-checked={voiceResponses}
                aria-label={t('voiceResponses')}
              >
                <span className={`absolute top-0.5 sm:top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  voiceResponses ? 'end-0.5 sm:end-1' : 'start-0.5 sm:start-1'
                }`} />
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
                onClick={() => {
                  const next = !notificationsEnabled;
                  setNotificationsEnabled(next);
                  localStorage.setItem('nova-notifications-enabled', String(next));
                }}
                className={`w-11 sm:w-12 h-6 sm:h-7 rounded-full relative transition-colors shrink-0 ${
                  notificationsEnabled ? 'bg-violet-500' : 'bg-white/20'
                }`}
                role="switch"
                aria-checked={notificationsEnabled}
                aria-label={t('notifications')}
              >
                <span className={`absolute top-0.5 sm:top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  notificationsEnabled ? 'end-0.5 sm:end-1' : 'start-0.5 sm:start-1'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* Desktop Automation (only shown in Electron app) */}
        {isDesktop && (
          <section className="mb-8 sm:mb-12">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              Desktop Automation
            </h2>
            <Link
              href="/settings/desktop"
              className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:bg-white/10 transition-all group"
            >
              <div>
                <h3 className="text-sm sm:text-base text-white font-medium mb-1">Manage Desktop Features</h3>
                <p className="text-white/40 text-xs sm:text-sm">
                  System controls, accessibility, local routines, and system info
                </p>
              </div>
              <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </section>
        )}

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
            {deleteConfirm && (
              <p className="text-red-400 text-xs sm:text-sm mb-3 font-medium">
                Are you sure? This action cannot be undone. Click again to confirm.
              </p>
            )}
            <div className="flex items-center gap-3">
              <button 
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                aria-label={t('deleteMyAccount')}
              >
                {deleting ? 'Deleting...' : deleteConfirm ? 'Confirm deletion' : t('deleteMyAccount')}
              </button>
              {deleteConfirm && (
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/60 text-xs sm:text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
