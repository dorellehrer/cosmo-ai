import Link from 'next/link';
import type { Metadata } from 'next';
import { PublicNav } from '@/components/PublicNav';
import { PublicFooter } from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Integrations — Nova AI',
  description:
    'Connect Nova to 50+ apps and services you already use. Google, Spotify, Slack, Notion, WhatsApp, smart home, and more.',
  openGraph: {
    title: 'Integrations — Nova AI',
    description:
      'Connect Nova to 50+ apps and services you already use. Google, Spotify, Slack, Notion, WhatsApp, smart home, and more.',
  },
};

const integrationCategories = [
  {
    name: 'AI Models',
    description: 'Choose your intelligence level — from fast and affordable to deep reasoning',
    icon: '🧠',
    items: [
      { name: 'GPT-5 Mini', description: 'Fast, affordable everyday assistant', icon: '⚡' },
      { name: 'GPT-5.2', description: 'Advanced reasoning and analysis', icon: '🔬' },
      { name: 'Claude Sonnet 4.5', description: 'Creative writing and nuanced tasks', icon: '🎭' },
      { name: 'Claude Opus 4.6', description: 'Maximum intelligence for complex problems', icon: '🏛️' },
      { name: 'GPT-5.2 Pro', description: 'Deep reasoning with maximum context', icon: '💎' },
    ],
  },
  {
    name: 'Productivity',
    description: 'Manage your calendar, email, documents, and tasks',
    icon: '📋',
    items: [
      { name: 'Google Calendar', description: 'View events, create meetings, check availability', icon: '📅', color: 'text-blue-400' },
      { name: 'Gmail', description: 'Search emails, read messages, draft replies', icon: '📧', color: 'text-red-400' },
      { name: 'Google Drive', description: 'Find documents, access files, search content', icon: '📁', color: 'text-yellow-400' },
      { name: 'Notion', description: 'Search pages, create docs, manage databases', icon: '📝', color: 'text-white' },
      { name: 'Slack', description: 'Browse channels, search messages, post updates', icon: '💬', color: 'text-purple-400' },
      { name: 'Apple Notes', description: 'Create notes, search content, organize folders', icon: '📒', color: 'text-yellow-300' },
      { name: 'Apple Reminders', description: 'Create tasks, manage lists, set due dates', icon: '✅', color: 'text-blue-300' },
      { name: 'Apple Mail', description: 'Search mail, read messages, send emails', icon: '✉️', color: 'text-blue-400' },
    ],
  },
  {
    name: 'Music & Audio',
    description: 'Control your music and discover new sounds',
    icon: '🎵',
    items: [
      { name: 'Spotify', description: 'Play music, search tracks, control playback', icon: '🎧', color: 'text-green-400' },
      { name: 'Sonos', description: 'Multi-room audio, volume, grouping', icon: '🔊', color: 'text-white' },
      { name: 'Text-to-Speech', description: 'Read content aloud in natural voices', icon: '🗣️', color: 'text-violet-300' },
    ],
  },
  {
    name: 'Smart Home',
    description: 'Control your lights, scenes, and home automation',
    icon: '🏠',
    items: [
      { name: 'Philips Hue', description: 'Lights, colors, scenes, rooms, and schedules', icon: '💡', color: 'text-amber-400' },
    ],
  },
  {
    name: 'Desktop Automation',
    description: 'Full macOS control from your keyboard — available in the desktop app',
    icon: '💻',
    items: [
      { name: 'File System', description: 'Read, write, search, and organize files', icon: '📂' },
      { name: 'App Control', description: 'Launch, quit, focus, and list running apps', icon: '🚀' },
      { name: 'Window Management', description: 'Resize, move, minimize, and arrange windows', icon: '🪟' },
      { name: 'System Control', description: 'Volume, brightness, dark mode, Do Not Disturb', icon: '⚙️' },
      { name: 'Shell Commands', description: 'Run terminal commands and scripts', icon: '⌨️' },
      { name: 'Screenshot', description: 'Capture screen or specific app windows', icon: '📸' },
      { name: 'Clipboard', description: 'Read and write text and images', icon: '📋' },
      { name: 'Spotlight Search', description: 'Search files, apps, and documents', icon: '🔍' },
      { name: 'Accessibility', description: 'Click buttons, type text, read screen elements', icon: '♿' },
      { name: 'Local Routines', description: 'Schedule automated tasks that run offline', icon: '⏰' },
    ],
  },
  {
    name: 'Built-in Tools',
    description: 'Always available — no setup required',
    icon: '⚡',
    items: [
      { name: 'Web Search', description: 'Search the internet for current information', icon: '🔍' },
      { name: 'Web Fetch', description: 'Read and extract content from any URL', icon: '🌐' },
      { name: 'Image Generation', description: 'Create images from text descriptions', icon: '🎨' },
      { name: 'Calculator', description: 'Math, conversions, and formulas', icon: '🧮' },
      { name: 'Weather', description: 'Current conditions and forecasts worldwide', icon: '⛅' },
      { name: 'Translation', description: 'Translate between any languages', icon: '🌍' },
      { name: 'Date & Time', description: 'Timezone conversions and date math', icon: '🕐' },
      { name: 'URL Summary', description: 'Summarize any article or webpage', icon: '📄' },
    ],
  },
  {
    name: 'Platforms',
    description: 'Use Nova everywhere',
    icon: '📱',
    items: [
      { name: 'macOS', description: 'Full desktop app with system automation', icon: '🍎' },
      { name: 'Windows', description: 'Desktop app with file access and shortcuts', icon: '🪟' },
      { name: 'Web', description: 'Access from any browser, anywhere', icon: '🌐' },
      { name: 'Mobile (PWA)', description: 'Install on iPhone and Android as a web app', icon: '📱' },
    ],
  },
];

const totalCount = integrationCategories.reduce((sum, cat) => sum + cat.items.length, 0);

export default function IntegrationsCatalogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <PublicNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-6">
            {totalCount}+ integrations and tools
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Works with everything
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto">
            Connect Nova to the apps and services you already use. Set up in seconds, automate in minutes.
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-16 sm:space-y-20">
          {integrationCategories.map((category) => (
            <section key={category.name}>
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <span className="text-2xl">{category.icon}</span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">{category.name}</h2>
                  <p className="text-white/50 text-sm sm:text-base">{category.description}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {category.items.map((item) => (
                  <div
                    key={item.name}
                    className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-violet-500/30 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5 shrink-0 group-hover:scale-110 transition-transform">
                        {item.icon}
                      </span>
                      <div>
                        <h3 className="text-white font-medium group-hover:text-violet-300 transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-white/50 text-sm mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 sm:mt-28 text-center">
          <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-white/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Ready to get started?
            </h2>
            <p className="text-white/60 mb-8 max-w-lg mx-auto">
              Create a free account and connect your first integration in under a minute.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/sign-up"
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold transition-all shadow-lg shadow-violet-500/25"
              >
                Start free
              </Link>
              <Link
                href="/showcase"
                className="px-6 py-3 border border-white/20 hover:bg-white/10 rounded-full text-white font-semibold transition-all"
              >
                See what people build
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
