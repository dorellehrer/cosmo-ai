'use client';

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  shortcut?: string[];
  category: 'navigation' | 'actions';
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcuts: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenShortcuts }: CommandPaletteProps) {
  const router = useRouter();
  const t = useTranslations('commandPalette');
  const common = useTranslations('common');
  
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const baseCommands: Command[] = [
    {
      id: 'chat',
      title: t('chat') || 'Chat',
      subtitle: t('goToChat') || 'Open your conversation with Nova',
      icon: '💬',
      category: 'actions',
      action: () => {
        router.push('/chat');
        onClose();
      },
    },
    {
      id: 'settings',
      title: common('settings'),
      subtitle: t('managePreferences'),
      icon: '⚙️',
      shortcut: ['⌘', ','],
      category: 'navigation',
      action: () => {
        router.push('/settings');
        onClose();
      },
    },
    {
      id: 'shortcuts',
      title: t('keyboardShortcuts'),
      subtitle: t('viewAllShortcuts'),
      icon: '⌨️',
      shortcut: ['?'],
      category: 'navigation',
      action: () => {
        onClose();
        onOpenShortcuts();
      },
    },
    {
      id: 'shortcuts-page',
      title: t('shortcutsPage'),
      subtitle: t('fullShortcutsList'),
      icon: '📋',
      category: 'navigation',
      action: () => {
        router.push('/shortcuts');
        onClose();
      },
    },
    {
      id: 'home',
      title: t('goHome'),
      subtitle: t('returnToLanding'),
      icon: '🏠',
      category: 'navigation',
      action: () => {
        router.push('/');
        onClose();
      },
    },
    {
      id: 'pricing',
      title: t('pricing'),
      subtitle: t('viewPlans'),
      icon: '💎',
      category: 'navigation',
      action: () => {
        router.push('/pricing');
        onClose();
      },
    },
    {
      id: 'about',
      title: t('about'),
      subtitle: t('learnAboutNova'),
      icon: '💜',
      category: 'navigation',
      action: () => {
        router.push('/about');
        onClose();
      },
    },
  ];

  const allCommands = baseCommands;

  // Filter commands based on search
  const filteredCommands = search.trim()
    ? allCommands.filter(cmd =>
        cmd.title.toLowerCase().includes(search.toLowerCase()) ||
        cmd.subtitle?.toLowerCase().includes(search.toLowerCase())
      )
    : allCommands;

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  const flatCommands = Object.values(groupedCommands).flat();

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % flatCommands.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + flatCommands.length) % flatCommands.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (flatCommands[selectedIndex]) {
          flatCommands[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [flatCommands, selectedIndex, onClose]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryLabels: Record<string, string> = {
    actions: t('actions'),
    navigation: t('navigation'),
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="min-h-full flex items-start justify-center pt-[15vh] px-4 pb-4">
        <div 
          className="relative w-full max-w-xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl shadow-violet-500/10 overflow-hidden animate-slide-up"
          role="dialog"
          aria-modal="true"
          aria-label={t('commandPalette')}
        >
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-violet-500/50 via-fuchsia-500/30 to-violet-500/50 -z-10" />
          
          {/* Search input */}
          <div className="relative border-b border-white/10">
            <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none">
              <svg 
                className="w-5 h-5 text-white/40" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-transparent text-white placeholder-white/40 py-4 ps-12 pe-4 text-base focus:outline-none"
              aria-label={t('searchCommands')}
            />
            <div className="absolute inset-y-0 end-4 flex items-center">
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-white/40 bg-white/5 rounded border border-white/10">
                esc
              </kbd>
            </div>
          </div>

          {/* Commands list */}
          <div 
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto overscroll-contain py-2"
            role="listbox"
          >
            {flatCommands.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                {t('noResults')}
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, commands]) => (
                <Fragment key={category}>
                  <div className="px-4 py-2 text-xs font-medium text-white/40 uppercase tracking-wider">
                    {categoryLabels[category] || category}
                  </div>
                  {commands.map((cmd) => {
                    const globalIndex = flatCommands.indexOf(cmd);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <button
                        key={cmd.id}
                        data-index={globalIndex}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-start transition-colors ${
                          isSelected 
                            ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-white' 
                            : 'text-white/70 hover:text-white'
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="text-xl flex-shrink-0" aria-hidden="true">{cmd.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{cmd.title}</div>
                          {cmd.subtitle && (
                            <div className="text-sm text-white/40 truncate">{cmd.subtitle}</div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                            {cmd.shortcut.map((key, i) => (
                              <kbd 
                                key={i}
                                className="px-1.5 py-0.5 text-xs text-white/50 bg-white/5 rounded border border-white/10"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </Fragment>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between text-xs text-white/40">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">↓</kbd>
                {t('toNavigate')}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">↵</kbd>
                {t('toSelect')}
              </span>
            </div>
            <span className="hidden sm:inline">{t('poweredBy')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
