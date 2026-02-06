'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface UsageData {
  tier: string;
  tierName: string;
  limit: number;
  used: number;
  remaining: number;
  subscriptionEnd: string | null;
}

const INTEGRATIONS = [
  {
    id: 'google',
    name: 'Google',
    icon: '📧',
    description: 'Calendar, Gmail, Drive',
    connected: false,
    color: 'from-red-500 to-yellow-500',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🎵',
    description: 'Music control',
    connected: false,
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'hue',
    name: 'Philips Hue',
    icon: '💡',
    description: 'Smart lights',
    connected: false,
    color: 'from-blue-500 to-purple-500',
  },
  {
    id: 'sonos',
    name: 'Sonos',
    icon: '🔊',
    description: 'Speakers',
    connected: false,
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: '📝',
    description: 'Notes & docs',
    connected: false,
    color: 'from-gray-600 to-gray-800',
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '💬',
    description: 'Team messages',
    connected: false,
    color: 'from-purple-500 to-pink-500',
  },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [name, setName] = useState('');
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for successful checkout
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setShowSuccess(true);
      // Refresh usage data
      fetchUsage();
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams]);

  // Fetch usage data
  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/usage');
      const data = await res.json();
      setUsage(data);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchUsage();
    }
  }, [session]);

  const handleConnect = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: !i.connected } : i))
    );
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal');
    } finally {
      setLoadingPortal(false);
    }
  };

  const isPro = usage?.tier === 'pro';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link
            href="/chat"
            className="flex items-center gap-1 sm:gap-2 text-white/60 hover:text-white transition-colors"
            aria-label="Back to chat"
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
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="text-sm sm:text-base">Back to chat</span>
          </Link>
          <h1 className="text-lg sm:text-xl font-semibold text-white">Settings</h1>
          <div className="w-16 sm:w-20" aria-hidden="true" />
        </div>
      </header>

      {/* Success Banner */}
      {showSuccess && (
        <div className="bg-green-500/20 border-b border-green-500/30 px-4 py-3 text-center">
          <p className="text-green-200 text-sm flex items-center justify-center gap-2">
            <span>🎉</span>
            Welcome to Pro! You now have unlimited messages.
          </p>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Profile Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            Profile
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
                <label htmlFor="name-input" className="sr-only">Your name</label>
                <input
                  id="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-transparent text-lg sm:text-xl font-semibold text-white placeholder-white/40 focus:outline-none border-b border-transparent focus:border-violet-500 transition-colors truncate"
                />
                <p className="text-white/40 text-xs sm:text-sm mt-1">
                  {isPro ? (
                    <span className="text-violet-400">✨ Pro plan</span>
                  ) : (
                    'Free plan'
                  )} · Member since Feb 2026
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="subscription-heading">
          <h2 id="subscription-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            Subscription
          </h2>
          <div className={`border rounded-xl sm:rounded-2xl p-4 sm:p-6 ${
            isPro 
              ? 'bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border-violet-500/30' 
              : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isPro && <span className="text-xl">✨</span>}
                  <h3 className="text-lg sm:text-xl font-semibold text-white">
                    {usage?.tierName || 'Free'} Plan
                  </h3>
                </div>
                <p className="text-white/60 text-sm">
                  {isPro 
                    ? 'Unlimited messages, priority support' 
                    : `${usage?.limit || 50} messages per day`}
                </p>
              </div>
              {isPro ? (
                <div className="px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30">
                  <span className="text-violet-300 text-xs font-medium">Active</span>
                </div>
              ) : (
                <Link
                  href="/pricing"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-sm font-medium transition-colors"
                >
                  Upgrade
                </Link>
              )}
            </div>

            {/* Usage Stats */}
            {usage && !isPro && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Today&apos;s usage</span>
                  <span className="text-white">{usage.used} / {usage.limit}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      usage.used / usage.limit >= 0.8
                        ? 'bg-yellow-500'
                        : 'bg-violet-500'
                    }`}
                    style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Subscription End Date */}
            {isPro && usage?.subscriptionEnd && (
              <p className="text-white/40 text-sm mb-4">
                Renews on {new Date(usage.subscriptionEnd).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}

            {/* Manage Button */}
            {isPro && (
              <button
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="w-full py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loadingPortal ? 'Opening...' : 'Manage Subscription'}
              </button>
            )}
          </div>
        </section>

        {/* Integrations Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="integrations-heading">
          <h2 id="integrations-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            Connected Services
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
                      {integration.name}
                    </h3>
                    <p className="text-white/40 text-xs sm:text-sm truncate">
                      {integration.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleConnect(integration.id)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 ml-2 ${
                    integration.connected
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  aria-label={`${integration.connected ? 'Disconnect' : 'Connect'} ${integration.name}`}
                  aria-pressed={integration.connected}
                >
                  {integration.connected ? 'Connected' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Preferences Section */}
        <section className="mb-8 sm:mb-12" aria-labelledby="preferences-heading">
          <h2 id="preferences-heading" className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            Preferences
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl divide-y divide-white/10">
            <div className="p-3 sm:p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base text-white font-medium">Voice responses</h3>
                <p className="text-white/40 text-xs sm:text-sm">
                  Cosmo will speak responses out loud
                </p>
              </div>
              <button 
                className="w-11 sm:w-12 h-6 sm:h-7 bg-white/20 rounded-full relative transition-colors shrink-0"
                role="switch"
                aria-checked="false"
                aria-label="Voice responses"
              >
                <span className="absolute left-0.5 sm:left-1 top-0.5 sm:top-1 w-5 h-5 bg-white rounded-full transition-transform" />
              </button>
            </div>
            <div className="p-3 sm:p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base text-white font-medium">Notifications</h3>
                <p className="text-white/40 text-xs sm:text-sm">
                  Get alerts for reminders and updates
                </p>
              </div>
              <button 
                className="w-11 sm:w-12 h-6 sm:h-7 bg-violet-500 rounded-full relative transition-colors shrink-0"
                role="switch"
                aria-checked="true"
                aria-label="Notifications"
              >
                <span className="absolute right-0.5 sm:right-1 top-0.5 sm:top-1 w-5 h-5 bg-white rounded-full transition-transform" />
              </button>
            </div>
            <div className="p-3 sm:p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base text-white font-medium">Dark mode</h3>
                <p className="text-white/40 text-xs sm:text-sm">Always on (it&apos;s cozy)</p>
              </div>
              <button 
                className="w-11 sm:w-12 h-6 sm:h-7 bg-violet-500 rounded-full relative transition-colors cursor-not-allowed opacity-50 shrink-0"
                role="switch"
                aria-checked="true"
                aria-disabled="true"
                aria-label="Dark mode (always enabled)"
              >
                <span className="absolute right-0.5 sm:right-1 top-0.5 sm:top-1 w-5 h-5 bg-white rounded-full transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section aria-labelledby="danger-heading">
          <h2 id="danger-heading" className="text-base sm:text-lg font-semibold text-red-400 mb-3 sm:mb-4">
            Danger Zone
          </h2>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <h3 className="text-sm sm:text-base text-white font-medium mb-2">Delete account</h3>
            <p className="text-white/40 text-xs sm:text-sm mb-3 sm:mb-4">
              This will permanently delete your account, conversations, and all
              connected integrations.
            </p>
            <button 
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-xs sm:text-sm font-medium transition-colors"
              aria-label="Delete my account permanently"
            >
              Delete my account
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
