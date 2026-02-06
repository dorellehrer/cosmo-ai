'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const t = useTranslations('shortcuts');
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen) {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstEl = focusableElements?.[0] as HTMLElement;
      const lastEl = focusableElements?.[focusableElements.length - 1] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          } else if (!e.shiftKey && document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      };

      window.addEventListener('keydown', handleTab);
      firstEl?.focus();
      return () => window.removeEventListener('keydown', handleTab);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: t('general'),
      shortcuts: [
        { keys: ['⌘', 'K'], description: t('openCommandPalette') },
        { keys: ['?'], description: t('showShortcuts') },
        { keys: ['Esc'], description: t('closeModal') },
      ],
    },
    {
      title: t('chatActions'),
      shortcuts: [
        { keys: ['⌘', 'N'], description: t('newChat') },
        { keys: ['⌘', 'B'], description: t('toggleSidebar') },
        { keys: ['⌘', '↵'], description: t('sendMessage') },
      ],
    },
    {
      title: t('navigationLabel'),
      shortcuts: [
        { keys: ['⌘', ','], description: t('openSettings') },
        { keys: ['⌘', '/'], description: t('openHelp') },
        { keys: ['G', 'H'], description: t('goHome') },
        { keys: ['G', 'C'], description: t('goChat') },
      ],
    },
    {
      title: t('commandPaletteLabel'),
      shortcuts: [
        { keys: ['↑'], description: t('previousItem') },
        { keys: ['↓'], description: t('nextItem') },
        { keys: ['↵'], description: t('selectItem') },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="min-h-full flex items-center justify-center p-4">
        <div 
          ref={modalRef}
          className="relative w-full max-w-2xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl shadow-violet-500/10 overflow-hidden animate-slide-up"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
        >
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-violet-500/50 via-fuchsia-500/30 to-violet-500/50 -z-10" />
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">⌨️</span>
              <h2 id="shortcuts-title" className="text-xl font-semibold text-white">
                {t('title')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              aria-label={t('close')}
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Shortcuts grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-medium text-violet-400 uppercase tracking-wider mb-3">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-white/70 text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <kbd 
                            key={keyIdx}
                            className="min-w-[24px] h-6 inline-flex items-center justify-center px-1.5 text-xs font-medium text-white bg-gradient-to-b from-white/10 to-white/5 rounded border border-white/20 shadow-sm"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/40">
                {t('tip')}: <span className="text-white/60">{t('tipText')}</span>
              </p>
              <a 
                href="/shortcuts" 
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                {t('viewAllShortcuts')} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
