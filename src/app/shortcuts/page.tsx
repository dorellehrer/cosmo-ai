'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useKeyboardShortcuts } from '@/contexts/KeyboardShortcutsContext';

interface ShortcutItem {
  id: string;
  keys: string;
  description: string;
  detail: string;
}

interface ShortcutCategory {
  id: string;
  title: string;
  description: string;
  shortcuts: ShortcutItem[];
}

export default function ShortcutsPage() {
  const t = useTranslations('shortcuts');
  const common = useTranslations('common');
  const { openCommandPalette } = useKeyboardShortcuts();

  const categories: ShortcutCategory[] = [
    {
      id: 'general',
      title: t('categories.general.title'),
      description: t('categories.general.description'),
      shortcuts: [
        { id: 'cmdK', keys: t('allShortcuts.cmdK.keys'), description: t('allShortcuts.cmdK.description'), detail: t('allShortcuts.cmdK.detail') },
        { id: 'question', keys: t('allShortcuts.question.keys'), description: t('allShortcuts.question.description'), detail: t('allShortcuts.question.detail') },
        { id: 'escape', keys: t('allShortcuts.escape.keys'), description: t('allShortcuts.escape.description'), detail: t('allShortcuts.escape.detail') },
      ],
    },
    {
      id: 'chat',
      title: t('categories.chat.title'),
      description: t('categories.chat.description'),
      shortcuts: [
        { id: 'cmdN', keys: t('allShortcuts.cmdN.keys'), description: t('allShortcuts.cmdN.description'), detail: t('allShortcuts.cmdN.detail') },
        { id: 'cmdB', keys: t('allShortcuts.cmdB.keys'), description: t('allShortcuts.cmdB.description'), detail: t('allShortcuts.cmdB.detail') },
        { id: 'cmdEnter', keys: t('allShortcuts.cmdEnter.keys'), description: t('allShortcuts.cmdEnter.description'), detail: t('allShortcuts.cmdEnter.detail') },
      ],
    },
    {
      id: 'navigation',
      title: t('categories.navigation.title'),
      description: t('categories.navigation.description'),
      shortcuts: [
        { id: 'cmdComma', keys: t('allShortcuts.cmdComma.keys'), description: t('allShortcuts.cmdComma.description'), detail: t('allShortcuts.cmdComma.detail') },
        { id: 'cmdSlash', keys: t('allShortcuts.cmdSlash.keys'), description: t('allShortcuts.cmdSlash.description'), detail: t('allShortcuts.cmdSlash.detail') },
        { id: 'gH', keys: t('allShortcuts.gH.keys'), description: t('allShortcuts.gH.description'), detail: t('allShortcuts.gH.detail') },
        { id: 'gC', keys: t('allShortcuts.gC.keys'), description: t('allShortcuts.gC.description'), detail: t('allShortcuts.gC.detail') },
        { id: 'gS', keys: t('allShortcuts.gS.keys'), description: t('allShortcuts.gS.description'), detail: t('allShortcuts.gS.detail') },
        { id: 'gP', keys: t('allShortcuts.gP.keys'), description: t('allShortcuts.gP.description'), detail: t('allShortcuts.gP.detail') },
      ],
    },
    {
      id: 'commandPalette',
      title: t('categories.commandPalette.title'),
      description: t('categories.commandPalette.description'),
      shortcuts: [
        { id: 'arrowUp', keys: t('allShortcuts.arrowUp.keys'), description: t('allShortcuts.arrowUp.description'), detail: t('allShortcuts.arrowUp.detail') },
        { id: 'arrowDown', keys: t('allShortcuts.arrowDown.keys'), description: t('allShortcuts.arrowDown.description'), detail: t('allShortcuts.arrowDown.detail') },
        { id: 'enter', keys: t('allShortcuts.enter.keys'), description: t('allShortcuts.enter.description'), detail: t('allShortcuts.enter.detail') },
      ],
    },
  ];

  const renderKeys = (keys: string) => {
    // Split by space but keep multi-char keys together
    const parts = keys.split(' ').filter(Boolean);
    return parts.map((key, idx) => (
      <span key={idx} className="inline-flex items-center">
        {idx > 0 && <span className="mx-1 text-white/30">then</span>}
        <kbd className="min-w-[28px] h-7 inline-flex items-center justify-center px-2 text-sm font-medium text-white bg-gradient-to-b from-white/15 to-white/5 rounded-lg border border-white/20 shadow-lg shadow-black/20">
          {key}
        </kbd>
      </span>
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link 
            href="/chat" 
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
          >
            <svg 
              className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToChat')}
          </Link>
          
          <button
            onClick={openCommandPalette}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-xs bg-white/10 rounded border border-white/20">⌘K</kbd>
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-violet-600/20 blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm text-white/70 mb-6">
            <span className="text-xl">⌨️</span>
            <span>Keyboard-first design</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            {t('pageTitle')}
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto">
            {t('pageDescription')}
          </p>
          
          {/* Quick start */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={openCommandPalette}
              className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium transition-all shadow-lg shadow-violet-500/25"
            >
              <span>Try Command Palette</span>
              <kbd className="px-2 py-0.5 text-sm bg-white/20 rounded">⌘K</kbd>
            </button>
            <Link
              href="/chat"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
            >
              <span>Start chatting</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Shortcuts Grid */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="space-y-12">
          {categories.map((category) => (
            <section key={category.id} className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-white mb-2">{category.title}</h2>
                <p className="text-white/50">{category.description}</p>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="group relative p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/50 hover:bg-white/10 transition-all duration-300"
                  >
                    {/* Gradient glow on hover */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600/0 to-fuchsia-600/0 group-hover:from-violet-600/10 group-hover:to-fuchsia-600/10 transition-all duration-300" />
                    
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1">
                          {renderKeys(shortcut.keys)}
                        </div>
                      </div>
                      <h3 className="font-medium text-white mb-1">{shortcut.description}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{shortcut.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Tips Section */}
        <section className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            Pro Tips
          </h2>
          <ul className="space-y-3 text-white/70">
            <li className="flex items-start gap-3">
              <span className="text-violet-400 mt-1">•</span>
              <span>The command palette (<kbd className="px-1.5 py-0.5 text-xs bg-white/10 rounded border border-white/20">⌘K</kbd>) is your best friend — use it to search conversations and run any command.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-violet-400 mt-1">•</span>
              <span>Go-to shortcuts (like <kbd className="px-1.5 py-0.5 text-xs bg-white/10 rounded border border-white/20">G</kbd> <kbd className="px-1.5 py-0.5 text-xs bg-white/10 rounded border border-white/20">H</kbd>) work by pressing keys in sequence — no need to hold them together.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-violet-400 mt-1">•</span>
              <span>Shortcuts work globally except when you&apos;re typing in an input field. <kbd className="px-1.5 py-0.5 text-xs bg-white/10 rounded border border-white/20">⌘K</kbd> always works though!</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-violet-400 mt-1">•</span>
              <span>On Windows/Linux, replace <kbd className="px-1.5 py-0.5 text-xs bg-white/10 rounded border border-white/20">⌘</kbd> with <kbd className="px-1.5 py-0.5 text-xs bg-white/10 rounded border border-white/20">Ctrl</kbd>.</span>
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-white/40 text-sm">
          <p>{common('copyright')}</p>
        </div>
      </footer>
    </div>
  );
}
