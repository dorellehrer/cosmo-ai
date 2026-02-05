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
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/chat"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
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
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to chat
          </Link>
          <h1 className="text-xl font-semibold text-white">Settings</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Section */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl">
                {name ? name[0].toUpperCase() : '👤'}
              </div>
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-transparent text-xl font-semibold text-white placeholder-white/40 focus:outline-none border-b border-transparent focus:border-violet-500 transition-colors"
                />
                <p className="text-white/40 text-sm mt-1">
                  Free plan · Member since Feb 2026
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-4">
            Connected Services
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center text-xl`}
                  >
                    {integration.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">
                      {integration.name}
                    </h3>
                    <p className="text-white/40 text-sm">
                      {integration.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleConnect(integration.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    integration.connected
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {integration.connected ? 'Connected' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Preferences Section */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-4">Preferences</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10">
            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Voice responses</h3>
                <p className="text-white/40 text-sm">
                  Cosmo will speak responses out loud
                </p>
              </div>
              <button className="w-12 h-7 bg-white/20 rounded-full relative transition-colors">
                <span className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Notifications</h3>
                <p className="text-white/40 text-sm">
                  Get alerts for reminders and updates
                </p>
              </div>
              <button className="w-12 h-7 bg-violet-500 rounded-full relative transition-colors">
                <span className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full transition-transform" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Dark mode</h3>
                <p className="text-white/40 text-sm">Always on (it&apos;s cozy)</p>
              </div>
              <button className="w-12 h-7 bg-violet-500 rounded-full relative transition-colors cursor-not-allowed opacity-50">
                <span className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-lg font-semibold text-red-400 mb-4">
            Danger Zone
          </h2>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
            <h3 className="text-white font-medium mb-2">Delete account</h3>
            <p className="text-white/40 text-sm mb-4">
              This will permanently delete your account, conversations, and all
              connected integrations.
            </p>
            <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-colors">
              Delete my account
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
