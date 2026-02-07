'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useIntegrations, AVAILABLE_INTEGRATIONS } from '@/contexts/IntegrationsContext';
import { NotificationBell } from '@/components/notifications';

// Integration-specific brand icons (using emoji + gradient combinations)
const INTEGRATION_DETAILS: Record<string, {
  brandIcon: React.ReactNode;
  fullDescription: string;
  features: string[];
}> = {
  google: {
    brandIcon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    fullDescription: 'Connect your Google account to access Calendar for scheduling, Gmail for reading emails, and Drive for file search.',
    features: ['View and create calendar events', 'Read email summaries', 'Search files in Drive', 'Check upcoming events'],
  },
  hue: {
    brandIcon: (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-red-500 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
          <path d="M12 2C9.24 2 7 4.24 7 7v5h10V7c0-2.76-2.24-5-5-5zM9 7c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V7zm-2 7v5c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-5H7zm5 5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
        </svg>
      </div>
    ),
    fullDescription: 'Philips Hue smart light integration is coming soon. Connect to control lights, set scenes, and adjust brightness.',
    features: ['Control individual lights (coming soon)', 'Activate scenes (coming soon)', 'Adjust brightness and color (coming soon)', 'Schedule lighting (coming soon)'],
  },
  spotify: {
    brandIcon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8">
        <path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
    fullDescription: 'Connect Spotify to check what\'s playing and search for songs, artists, and albums through Nova.',
    features: ['Check currently playing track', 'Search for music', 'Browse artists and albums', 'Discover new music'],
  },
  sonos: {
    brandIcon: (
      <div className="w-8 h-8 rounded bg-black flex items-center justify-center">
        <span className="text-white font-bold text-xs tracking-wider">SONOS</span>
      </div>
    ),
    fullDescription: 'Sonos speaker integration is coming soon. Control multi-room audio, adjust volume, and group speakers.',
    features: ['Multi-room audio control (coming soon)', 'Group/ungroup speakers (coming soon)', 'Volume control (coming soon)', 'Play from various sources (coming soon)'],
  },
  notion: {
    brandIcon: (
      <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="black">
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933l3.222-.187zM2.877.466L16.082-.28c1.634-.14 2.055.047 2.755.56l3.783 2.66c.513.374.7.467.7 1.026v17.957c0 1.121-.42 1.775-1.869 1.868l-15.457.933c-1.075.047-1.588-.093-2.149-.793L1.1 20.264c-.513-.654-.747-1.12-.747-1.774V2.147c0-.84.42-1.54 1.524-1.68z"/>
        </svg>
      </div>
    ),
    fullDescription: 'Access your Notion workspace. Search pages, create notes, and manage your databases with natural language.',
    features: ['Search pages and databases', 'Create new pages', 'Update database entries', 'Quick capture notes'],
  },
  slack: {
    brandIcon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8">
        <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
        <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
        <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
        <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
      </svg>
    ),
    fullDescription: 'Connect Slack to search messages and browse your team channels through Nova.',
    features: ['Search workspace messages', 'List channels', 'Browse team communication', 'Stay updated'],
  },
};

// Connection modal — now initiates real OAuth flow
function ConnectionModal({ 
  integration, 
  onClose, 
  onConnect 
}: { 
  integration: typeof AVAILABLE_INTEGRATIONS[0];
  onClose: () => void;
  onConnect: () => void;
}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const details = INTEGRATION_DETAILS[integration.id];

  const handleConnect = () => {
    setIsConnecting(true);
    onConnect();
    // The page will redirect to OAuth provider — no need to close modal
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 bg-gradient-to-br ${integration.color} relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {details.brandIcon}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{integration.name}</h2>
              <p className="text-white/80 text-sm">{integration.description}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isConnecting ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center animate-pulse">
                <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              </div>
              <p className="text-white font-medium">Redirecting to {integration.name}...</p>
              <p className="text-white/40 text-sm mt-1">You&apos;ll be asked to authorize Nova</p>
            </div>
          ) : (
            <>
              <p className="text-white/70 text-sm mb-4">{details.fullDescription}</p>
              
              <div className="mb-6">
                <h3 className="text-white font-medium mb-2 text-sm">What Nova can do:</h3>
                <ul className="space-y-2">
                  {details.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-white/60 text-sm">
                      <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleConnect}
                className={`w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${integration.color} hover:opacity-90 transition-opacity`}
              >
                Connect {integration.name}
              </button>
              
              <p className="text-white/40 text-xs text-center mt-4">
                You&apos;ll be redirected to {integration.name} to authorize access. Nova requests read-only permissions.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { integrations, connectIntegration, disconnectIntegration } = useIntegrations();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const connectingIntegration = AVAILABLE_INTEGRATIONS.find((i) => i.id === connectingId);
  const connectedCount = integrations.filter((i) => i.connected).length;

  const handleDisconnect = (id: string) => {
    setDisconnectingId(id);
    // Small delay for visual feedback
    setTimeout(() => {
      disconnectIntegration(id);
      setDisconnectingId(null);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/chat"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Back to chat</span>
          </Link>
          <h1 className="text-xl font-semibold text-white">Integrations</h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link
              href="/settings"
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22v-5"/>
              <path d="M9 8V2"/>
              <path d="M15 8V2"/>
              <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>
              <path d="M3 8h18"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Connect Your Apps</h2>
          <p className="text-white/60 max-w-lg mx-auto">
            Link your favorite services to unlock the full power of Nova. The more you connect, the more I can help.
          </p>
          {connectedCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-sm font-medium">{connectedCount} connected</span>
            </div>
          )}
        </div>

        {/* Integration Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => {
            const details = INTEGRATION_DETAILS[integration.id];
            const isDisconnecting = disconnectingId === integration.id;
            
            return (
              <div
                key={integration.id}
                className={`group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 ${
                  isDisconnecting ? 'opacity-50 scale-95' : ''
                }`}
              >
                {/* Gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${integration.color}`} />
                
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integration.color} p-0.5`}>
                        <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center">
                          {details.brandIcon}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{integration.name}</h3>
                        <p className="text-white/40 text-sm">{integration.description}</p>
                      </div>
                    </div>
                    {integration.connected && (
                      <span className="px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium">
                        Connected
                      </span>
                    )}
                  </div>

                  {/* Features preview */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {integration.services?.map((service) => (
                        <span
                          key={service}
                          className="px-2 py-0.5 rounded bg-white/5 text-white/50 text-xs"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Connected info or connect button */}
                  {integration.connected ? (
                    <div className="space-y-3">
                      {integration.email && (
                        <p className="text-white/40 text-sm truncate">
                          {integration.email}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Link
                          href={`/integrations/${integration.id}`}
                          className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors text-center"
                        >
                          Manage
                        </Link>
                        <button
                          onClick={() => handleDisconnect(integration.id)}
                          className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConnectingId(integration.id)}
                      className={`w-full py-2.5 rounded-xl font-medium text-white bg-gradient-to-r ${integration.color} hover:opacity-90 transition-opacity`}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Help text */}
        <div className="mt-12 text-center">
          <p className="text-white/40 text-sm">
            Need another integration?{' '}
            <Link href="/contact" className="text-violet-400 hover:text-violet-300 underline">
              Let us know
            </Link>
          </p>
        </div>
      </main>

      {/* Connection Modal */}
      {connectingIntegration && (
        <ConnectionModal
          integration={connectingIntegration}
          onClose={() => setConnectingId(null)}
          onConnect={() => connectIntegration(connectingIntegration.id)}
        />
      )}
    </div>
  );
}
