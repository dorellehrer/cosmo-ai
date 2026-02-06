'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CommandPalette } from '@/components/CommandPalette';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';

interface KeyboardShortcutsContextType {
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
  isCommandPaletteOpen: boolean;
  isShortcutsModalOpen: boolean;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null);

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
}

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  
  // Track key sequence for go-to shortcuts (g + h, g + c, etc.)
  const [keySequence, setKeySequence] = useState<string[]>([]);

  const openCommandPalette = useCallback(() => {
    setIsShortcutsModalOpen(false);
    setIsCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  const openShortcutsModal = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setIsShortcutsModalOpen(true);
  }, []);

  const closeShortcutsModal = useCallback(() => {
    setIsShortcutsModalOpen(false);
  }, []);

  // Clear key sequence after timeout
  useEffect(() => {
    if (keySequence.length > 0) {
      const timeout = setTimeout(() => setKeySequence([]), 1000);
      return () => clearTimeout(timeout);
    }
  }, [keySequence]);

  // Handle go-to shortcuts
  useEffect(() => {
    if (keySequence.length === 2 && keySequence[0] === 'g') {
      const target = keySequence[1];
      if (target === 'h') {
        router.push('/');
        setKeySequence([]);
      } else if (target === 'c') {
        router.push('/chat');
        setKeySequence([]);
      } else if (target === 's') {
        router.push('/settings');
        setKeySequence([]);
      } else if (target === 'p') {
        router.push('/pricing');
        setKeySequence([]);
      }
    }
  }, [keySequence, router]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;

      // Cmd/Ctrl + K: Open command palette (works everywhere)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isCommandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
        return;
      }

      // Escape: Close any open modal
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          closeCommandPalette();
          return;
        }
        if (isShortcutsModalOpen) {
          closeShortcutsModal();
          return;
        }
      }

      // Don't process other shortcuts when modals are open
      if (isCommandPaletteOpen || isShortcutsModalOpen) return;

      // Don't process shortcuts when typing in inputs (except specific ones)
      if (isInputField) {
        // Cmd + Enter to submit (handled by individual components)
        return;
      }

      // ? - Show keyboard shortcuts
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openShortcutsModal();
        return;
      }

      // Cmd/Ctrl + N: New chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        router.push('/chat');
        return;
      }

      // Cmd/Ctrl + ,: Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        router.push('/settings');
        return;
      }

      // Cmd/Ctrl + /: Help/shortcuts page
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        router.push('/shortcuts');
        return;
      }

      // Track key sequence for go-to shortcuts
      if (e.key === 'g' || (keySequence.length === 1 && keySequence[0] === 'g')) {
        setKeySequence(prev => [...prev.slice(-1), e.key.toLowerCase()]);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    router, 
    pathname,
    isCommandPaletteOpen, 
    isShortcutsModalOpen, 
    keySequence,
    openCommandPalette,
    closeCommandPalette,
    openShortcutsModal,
    closeShortcutsModal,
  ]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        openCommandPalette,
        closeCommandPalette,
        openShortcutsModal,
        closeShortcutsModal,
        isCommandPaletteOpen,
        isShortcutsModalOpen,
      }}
    >
      {children}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        onOpenShortcuts={openShortcutsModal}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={closeShortcutsModal}
      />
    </KeyboardShortcutsContext.Provider>
  );
}
