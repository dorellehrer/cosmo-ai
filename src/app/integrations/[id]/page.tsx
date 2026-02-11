'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIntegrations, AVAILABLE_INTEGRATIONS } from '@/contexts/IntegrationsContext';

// Integration-specific brand icons
const INTEGRATION_ICONS: Record<string, React.ReactNode> = {
  google: (
    <svg viewBox="0 0 24 24" className="w-12 h-12">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  hue: (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-red-500 flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="white">
        <path d="M12 2C9.24 2 7 4.24 7 7v5h10V7c0-2.76-2.24-5-5-5zM9 7c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V7zm-2 7v5c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-5H7zm5 5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
      </svg>
    </div>
  ),
  spotify: (
    <svg viewBox="0 0 24 24" className="w-12 h-12">
      <path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  ),
  sonos: (
    <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center">
      <span className="text-white font-bold text-sm tracking-wider">SONOS</span>
    </div>
  ),
  notion: (
    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="black">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933l3.222-.187zM2.877.466L16.082-.28c1.634-.14 2.055.047 2.755.56l3.783 2.66c.513.374.7.467.7 1.026v17.957c0 1.121-.42 1.775-1.869 1.868l-15.457.933c-1.075.047-1.588-.093-2.149-.793L1.1 20.264c-.513-.654-.747-1.12-.747-1.774V2.147c0-.84.42-1.54 1.524-1.68z"/>
      </svg>
    </div>
  ),
  slack: (
    <svg viewBox="0 0 24 24" className="w-12 h-12">
      <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
      <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
      <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
      <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  ),
};

// Integration details
const INTEGRATION_DETAILS: Record<string, {
  fullDescription: string;
  features: string[];
  permissions: string[];
  dataAccess: string[];
  examplePrompts: string[];
}> = {
  google: {
    fullDescription: 'Connect your Google account to manage Calendar events (create, update, delete), send and read emails via Gmail, and search Drive files. Nova can help you manage your day-to-day activities seamlessly.',
    features: ['View, create, update, and delete calendar events', 'Send emails and read email summaries', 'Search files in Google Drive', 'Full calendar management'],
    permissions: ['Full calendar access (read, create, update, delete)', 'Read and send email messages', 'Read Google Drive file metadata (read-only)'],
    dataAccess: ['Calendar events and metadata', 'Email subjects, senders, and snippets', 'Drive file names and metadata'],
    examplePrompts: ["What's on my calendar today?", 'Do I have any emails from my manager?', 'Move my 2pm meeting to 3pm', 'Send an email to john@example.com about the project update'],
  },
  hue: {
    fullDescription: 'Connect Philips Hue to control your smart lights, activate scenes, and adjust brightness and colors through Nova. Manage your entire home lighting with natural language.',
    features: ['Control individual lights (on/off, brightness, color)', 'Activate scenes like Relax, Energize, and Read', 'List all lights and their status', 'List and activate scenes'],
    permissions: ['Control lights (on/off, brightness, color)', 'View light status', 'Access scenes and room configurations'],
    dataAccess: ['Light states and configurations', 'Room layouts', 'Scene settings'],
    examplePrompts: ['Turn off the living room lights', 'Set brightness to 50%', 'What lights are on?', 'Activate the relax scene'],
  },
  spotify: {
    fullDescription: 'Connect Spotify to control playback, check what\'s playing, browse your playlists, and search for songs, artists, and albums through Nova.',
    features: ['Play, pause, and resume music', 'Skip to next or previous track', 'Check currently playing track', 'Browse your playlists', 'Search for songs, artists, and albums'],
    permissions: ['Read current playback state', 'Control playback (play, pause, skip)', 'Read playlists', 'Search the Spotify catalog'],
    dataAccess: ['Current playback state', 'Your playlists', 'Search results from the Spotify catalog'],
    examplePrompts: ['What song is playing right now?', 'Show me my playlists', 'Search for songs by The Weeknd', 'Skip to the next track'],
  },
  sonos: {
    fullDescription: 'Connect Sonos to control multi-room audio, adjust volume, and manage speaker groups through Nova. Play, pause, skip, and adjust volume across all your speakers.',
    features: ['Multi-room audio control', 'Play, pause, and skip tracks', 'Volume control (0-100)', 'List speaker groups and players'],
    permissions: ['Control playback on all speakers', 'Adjust group volume', 'View speaker groups and status'],
    dataAccess: ['Speaker group configurations', 'Current playback state', 'Player information'],
    examplePrompts: ['What speakers are available?', 'Pause the music in the living room', 'Set the volume to 30', 'Skip to the next song'],
  },
  notion: {
    fullDescription: 'Access your Notion workspace with natural language. Search pages, create and update notes, and browse your knowledge base effortlessly.',
    features: ['Search pages and databases', 'Create new pages', 'Update existing pages', 'Quick capture notes'],
    permissions: ['Read pages', 'Create and update pages', 'Search workspace'],
    dataAccess: ['Page titles and content', 'Database entries', 'Workspace structure'],
    examplePrompts: ['Search my Notion for project plans', "Create a new page called 'Meeting Notes'", 'Update my project page with the latest status', 'Find my to-do list in Notion'],
  },
  slack: {
    fullDescription: 'Connect Slack to search messages, send messages to channels, send direct messages, reply in threads, and browse your team communication through Nova.',
    features: ['Search workspace messages', 'Send messages to channels', 'Send direct messages', 'Reply in threads', 'List and browse channels'],
    permissions: ['Read channels', 'Search workspace messages', 'Send messages to channels and DMs'],
    dataAccess: ['Channel listings and metadata', 'Message search results', 'Direct message conversations'],
    examplePrompts: ['Search Slack for messages about the deployment', 'What channels am I in?', "Send 'Hello team!' to the general channel", 'Send a DM to my colleague'],
  },
};

export default function IntegrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { integrations, connectIntegration, disconnectIntegration } = useIntegrations();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const baseIntegration = AVAILABLE_INTEGRATIONS.find((i) => i.id === id);
  const integration = integrations.find((i) => i.id === id);
  const details = INTEGRATION_DETAILS[id];
  const nowMs = Date.now();
  const expiresAtMs = integration?.expiresAt ? new Date(integration.expiresAt).getTime() : null;
  const isExpired = expiresAtMs !== null && expiresAtMs < nowMs;
  const isExpiringSoon = expiresAtMs !== null && !isExpired && expiresAtMs < nowMs + 24 * 60 * 60 * 1000;
  const isComingSoon = integration?.status === 'coming_soon' || integration?.connectionMode === 'preview';

  useEffect(() => {
    if (!baseIntegration) {
      router.push('/integrations');
    }
  }, [baseIntegration, router]);

  if (!baseIntegration || !integration) {
    return null;
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectIntegration(id);
      router.push('/integrations');
    } catch {
      setIsDisconnecting(false);
    }
    setShowDisconnectConfirm(false);
  };

  const handleConnect = () => {
    connectIntegration(id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/integrations"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Back to integrations</span>
          </Link>
          <h1 className="text-xl font-semibold text-white">{baseIntegration.name}</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className={`rounded-2xl bg-gradient-to-br ${baseIntegration.color} p-8 mb-8`}>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {INTEGRATION_ICONS[id]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-white">{baseIntegration.name}</h2>
                {integration.connected && (
                  <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Connected
                  </span>
                )}
              </div>
              <p className="text-white/80">{baseIntegration.description}</p>
              {integration.connected && integration.connectedAt && (
                <p className="text-white/60 text-sm mt-2">
                  Connected since {new Date(integration.connectedAt).toLocaleDateString()}
                  {integration.email && ` · ${integration.email}`}
                </p>
              )}
              {integration.connected && integration.expiresAt && (
                <p className={`text-sm mt-1 ${
                  isExpired
                    ? 'text-red-400'
                    : isExpiringSoon
                      ? 'text-amber-400'
                      : 'text-green-400/70'
                }`}>
                  {isExpired
                    ? 'Token expired — reconnect required'
                    : `Token valid until ${new Date(integration.expiresAt).toLocaleDateString()}`
                  }
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {!isComingSoon && details ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* About */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">About</h3>
            <p className="text-white/70 text-sm leading-relaxed">{details.fullDescription}</p>
          </div>

          {/* Features */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Features</h3>
            <ul className="space-y-2">
              {details.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-white/70 text-sm">
                  <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Permissions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Permissions Required</h3>
            <ul className="space-y-2">
              {details.permissions.map((permission, index) => (
                <li key={index} className="flex items-center gap-2 text-white/70 text-sm">
                  <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {permission}
                </li>
              ))}
            </ul>
          </div>

          {/* Data Access */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Data Access</h3>
            <ul className="space-y-2">
              {details.dataAccess.map((data, index) => (
                <li key={index} className="flex items-center gap-2 text-white/70 text-sm">
                  <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  {data}
                </li>
              ))}
            </ul>
          </div>
        </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Preview Integration</h3>
            <p className="text-white/70 text-sm">
              {baseIntegration.name} is listed in Nova, but connection is not available yet.
              You can still browse the planned capabilities here while we finalize backend and OAuth flows.
            </p>
          </div>
        )}

        {/* Try It Out Section */}
        {integration.connected && details && details.examplePrompts.length > 0 && (
          <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Try It Out</h3>
            <p className="text-white/60 text-sm mb-3">Try saying these in your chat with Nova:</p>
            <div className="grid gap-2">
              {details.examplePrompts.map((prompt, index) => (
                <Link
                  key={index}
                  href={`/chat?prompt=${encodeURIComponent(prompt)}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-colors group"
                >
                  <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-white/70 text-sm group-hover:text-white transition-colors">&ldquo;{prompt}&rdquo;</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Action Section */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6">
          {integration.connected ? (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Manage Connection</h3>
                <p className="text-white/60 text-sm">
                  {isExpired
                    ? 'Your connection has expired. Reconnect to continue using this integration.'
                    : 'This integration is currently active. Disconnect to revoke access.'
                  }
                </p>
              </div>
              {isExpired && (
                <button
                  onClick={handleConnect}
                  className={`px-4 py-2 rounded-lg bg-gradient-to-r ${baseIntegration.color} text-white text-sm font-medium hover:opacity-90 transition-opacity mr-2`}
                >
                  Reconnect
                </button>
              )}
              {showDisconnectConfirm ? (
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-sm">Are you sure?</span>
                  <button
                    onClick={() => setShowDisconnectConfirm(false)}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {isDisconnecting ? 'Disconnecting...' : 'Yes, disconnect'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Connect {baseIntegration.name}</h3>
                <p className="text-white/60 text-sm">
                  {isComingSoon
                    ? `${baseIntegration.name} is in preview and not yet connectable.`
                    : 'Enable this integration to unlock its features with Nova.'}
                </p>
              </div>
              <button
                onClick={handleConnect}
                disabled={isComingSoon}
                className={`px-6 py-2.5 rounded-xl text-white font-medium transition-opacity ${
                  isComingSoon
                    ? 'bg-white/10 text-white/60 cursor-not-allowed'
                    : `bg-gradient-to-r ${baseIntegration.color} hover:opacity-90`
                }`}
              >
                {isComingSoon ? 'Coming Soon' : 'Connect'}
              </button>
            </div>
          )}
        </div>

        {/* Privacy Note */}
        <div className="mt-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h4 className="text-violet-300 font-medium text-sm">Your privacy matters</h4>
              <p className="text-violet-300/70 text-sm mt-1">
                We only access the data necessary to provide the features above. Your data is never sold or shared with third parties. You can disconnect at any time to revoke all access.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Disconnect Confirmation Overlay */}
      {showDisconnectConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setShowDisconnectConfirm(false)}
        />
      )}
    </div>
  );
}
