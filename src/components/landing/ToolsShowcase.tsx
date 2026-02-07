'use client';

import { useState } from 'react';

const toolCategories = [
  {
    id: 'builtin',
    label: 'Built-in',
    icon: '⚡',
    tools: [
      { name: 'Web Search', description: 'Search the web for current information, news, and facts', icon: '🔍' },
      { name: 'Web Fetch', description: 'Read and extract content from any web page', icon: '🌐' },
      { name: 'URL Summary', description: 'Get concise summaries of any article or webpage', icon: '📄' },
      { name: 'Calculator', description: 'Advanced math, unit conversions, and formulas', icon: '🧮' },
      { name: 'Date & Time', description: 'Current date, time, and timezone conversions', icon: '🕐' },
      { name: 'Translation', description: 'Translate text between any languages instantly', icon: '🌍' },
      { name: 'Weather', description: 'Real-time weather for any location worldwide', icon: '⛅' },
      { name: 'Image Generation', description: 'Create images from text descriptions with DALL-E', icon: '🎨' },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: '🔗',
    tools: [
      { name: 'Google Calendar', description: 'View upcoming events and create new ones', icon: '📅' },
      { name: 'Gmail', description: 'Search and read your emails', icon: '📧' },
      { name: 'Google Drive', description: 'Find and access your documents and files', icon: '📁' },
      { name: 'Spotify', description: 'See what\'s playing, search music, control playback', icon: '🎵' },
      { name: 'Notion', description: 'Search pages, create documents and notes', icon: '📝' },
      { name: 'Slack', description: 'Search messages and browse channels', icon: '💬' },
    ],
  },
  {
    id: 'desktop',
    label: 'Desktop App',
    icon: '💻',
    tools: [
      { name: 'File Access', description: 'Read and save files on your computer', icon: '📂' },
      { name: 'Clipboard', description: 'Read from and write to your clipboard', icon: '📋' },
      { name: 'Screenshot', description: 'Capture your screen or app window', icon: '📸' },
      { name: 'System Info', description: 'Check CPU, memory, and system details', icon: '⚙️' },
      { name: 'Open Files', description: 'Launch files in their default applications', icon: '🚀' },
      { name: 'Quick Access', description: 'Global shortcut ⌘⇧C to summon Nova', icon: '⌨️' },
    ],
  },
];

export function ToolsShowcase() {
  const [activeCategory, setActiveCategory] = useState('builtin');
  const category = toolCategories.find((c) => c.id === activeCategory) || toolCategories[0];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24" aria-labelledby="tools-heading">
      <div className="text-center mb-12">
        <span className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-4">
          20+ tools and growing
        </span>
        <h2 id="tools-heading" className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Everything Nova can do
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Built-in tools work instantly. Connect integrations for even more power. Download the desktop app for local system access.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex justify-center gap-2 sm:gap-3 mb-10">
        {toolCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            <span>{cat.icon}</span>
            <span className="hidden sm:inline">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {category.tools.map((tool, index) => (
          <div
            key={tool.name}
            className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-violet-500/30 transition-all animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="text-2xl mb-3 transform transition-transform group-hover:scale-110">
              {tool.icon}
            </div>
            <h3 className="text-white font-medium mb-1 group-hover:text-violet-300 transition-colors">
              {tool.name}
            </h3>
            <p className="text-white/50 text-sm leading-relaxed">
              {tool.description}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-10">
        <p className="text-white/40 text-sm">
          All built-in tools are free • Integration tools require connecting your accounts • Desktop tools require the Nova app
        </p>
      </div>
    </section>
  );
}
