'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShortcutBadge } from '@/components/ShortcutHint';
import { useKeyboardShortcuts } from '@/contexts/KeyboardShortcutsContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string | null;
  updatedAt: string;
  messages?: { content: string }[];
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id?.[0] as string | undefined;
  
  const t = useTranslations('chat');
  const common = useTranslations('common');
  const { openCommandPalette } = useKeyboardShortcuts();

  const suggestions = [
    { key: 'email', text: t('suggestions.email') },
    { key: 'calendar', text: t('suggestions.calendar') },
    { key: 'lights', text: t('suggestions.lights') },
    { key: 'music', text: t('suggestions.music') },
  ];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Local keyboard shortcuts (global ones like Cmd+K handled by KeyboardShortcutsContext)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // Cmd/Ctrl + B for toggle sidebar (works in input too)
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
      
      // Skip other shortcuts when in input
      if (isInputField) return;
      
      // Escape to close sidebar on mobile
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Load conversation if ID is provided
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      // New chat
      setMessages([]);
      setCurrentConversationId(null);
      setCurrentTitle(null);
      inputRef.current?.focus();
    }
  }, [conversationId]);

  const loadConversation = async (id: string) => {
    try {
      setLoadingChat(true);
      const response = await fetch(`/api/conversations/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentConversationId(data.id);
        setCurrentTitle(data.title);
        setMessages(
          data.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.createdAt),
          }))
        );
      } else {
        // Conversation not found, redirect to new chat
        router.push('/chat');
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      router.push('/chat');
    } finally {
      setLoadingChat(false);
      // Focus input after loading
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const startNewChat = () => {
    router.push('/chat');
    setMessages([]);
    setCurrentConversationId(null);
    setCurrentTitle(null);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(t('deleteConversation'))) return;

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentConversationId === id) {
          startNewChat();
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add placeholder for assistant message
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                
                // Handle conversationId from new conversation
                if (parsed.conversationId && !currentConversationId) {
                  setCurrentConversationId(parsed.conversationId);
                  // Update URL without full navigation
                  window.history.replaceState(null, '', `/chat/${parsed.conversationId}`);
                }
                
                // Handle title update
                if (parsed.title) {
                  setCurrentTitle(parsed.title);
                  // Update conversations list
                  fetchConversations();
                }
                
                // Handle content
                if (parsed.content) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + parsed.content }
                        : m
                    )
                  );
                }
              } catch {
                // Ignore JSON parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: t('errorMessage') }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      // Refresh conversations list
      fetchConversations();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return t('today');
    if (days === 1) return t('yesterday');
    if (days < 7) return t('daysAgo', { days });
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 start-0 z-50 w-64 sm:w-72 bg-slate-900/95 backdrop-blur-xl border-e border-white/10 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0 rtl:-translate-x-0' : '-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:-translate-x-0'
        }`}
        role="navigation"
        aria-label="Conversations sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-3 sm:p-4 border-b border-white/10">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg sm:rounded-xl text-white text-sm sm:text-base font-medium transition-all shadow-lg shadow-violet-500/25 group"
              aria-label={t('newChat')}
              title="⌘N"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="flex-1">{t('newChat')}</span>
              <ShortcutBadge shortcut="⌘+N" className="opacity-60 group-hover:opacity-100" />
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8" role="status" aria-label={t('loadingConversations')}>
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <span className="sr-only">{t('loadingConversations')}</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-xs sm:text-sm">
                {t('noConversations')}
              </div>
            ) : (
              <nav aria-label="Conversation history">
                <ul className="space-y-1" role="list">
                  {conversations.map((conv) => (
                    <li key={conv.id}>
                      <Link
                        href={`/chat/${conv.id}`}
                        onClick={() => setSidebarOpen(false)}
                        className={`group flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 sm:py-3 rounded-lg transition-all ${
                          currentConversationId === conv.id
                            ? 'bg-white/15 text-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                        aria-current={currentConversationId === conv.id ? 'page' : undefined}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {conv.title || conv.messages?.[0]?.content?.slice(0, 30) || t('newChat')}
                            {!conv.title && conv.messages?.[0]?.content && conv.messages[0].content.length > 30 && '...'}
                          </p>
                          <p className="text-[10px] sm:text-xs text-white/40 mt-0.5">
                            {formatDate(conv.updatedAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteConversation(conv.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 sm:p-1.5 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-red-400"
                          aria-label={`Delete conversation: ${conv.title || 'Untitled'}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 sm:p-4 border-t border-white/10 space-y-1">
            <Link
              href="/settings"
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm group"
              title="⌘,"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span className="flex-1">{common('settings')}</span>
              <ShortcutBadge shortcut="⌘+," className="opacity-0 group-hover:opacity-100" />
            </Link>
            <Link
              href="/shortcuts"
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm group"
              title="?"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M8 16h8" />
              </svg>
              <span className="flex-1">Shortcuts</span>
              <ShortcutBadge shortcut="?" className="opacity-0 group-hover:opacity-100" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-10">
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60"
              aria-label={t('openSidebar')}
              aria-expanded={sidebarOpen}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity" aria-label="Cosmo AI homepage">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center" aria-hidden="true">
                <span className="text-lg sm:text-xl">✨</span>
              </div>
              <div className="hidden xs:block">
                <h1 className="text-lg sm:text-xl font-semibold text-white truncate max-w-[200px]">
                  {currentTitle || common('cosmo')}
                </h1>
                <p className="text-[10px] sm:text-xs text-white/60">
                  {currentTitle ? t('yourCompanion') : t('newConversation')}
                </p>
              </div>
            </Link>
            
            {/* Command Palette Button */}
            <div className="flex-1" />
            <button
              onClick={openCommandPalette}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/70 transition-all text-sm"
              aria-label="Open command palette"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] bg-white/10 rounded border border-white/20">⌘K</kbd>
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto" role="main" aria-label="Chat messages">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {loadingChat ? (
              <div className="space-y-3 sm:space-y-4 animate-pulse" role="status" aria-label={t('loadingConversation')}>
                {/* Loading skeleton for messages */}
                <div className="flex justify-end">
                  <div className="w-2/3 h-14 sm:h-16 bg-white/10 rounded-2xl" />
                </div>
                <div className="flex justify-start">
                  <div className="w-3/4 h-20 sm:h-24 bg-white/10 rounded-2xl" />
                </div>
                <div className="flex justify-end">
                  <div className="w-1/2 h-10 sm:h-12 bg-white/10 rounded-2xl" />
                </div>
                <div className="flex justify-start">
                  <div className="w-2/3 h-16 sm:h-20 bg-white/10 rounded-2xl" />
                </div>
                <span className="sr-only">{t('loadingConversation')}</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] sm:h-[60vh] text-center px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-4 sm:mb-6 animate-pulse" aria-hidden="true">
                  <span className="text-3xl sm:text-4xl">✨</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                  {t('greeting')}
                </h2>
                <p className="text-sm sm:text-base text-white/60 max-w-md mb-6 sm:mb-8">
                  {t('greetingDescription')}
                </p>
                <div className="flex flex-wrap gap-2 justify-center" role="group" aria-label="Suggested prompts">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.key}
                      onClick={() => handleSuggestionClick(suggestion.text)}
                      className="px-3 sm:px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-xs sm:text-sm transition-colors"
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4" role="log" aria-live="polite" aria-atomic="false">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    } animate-fade-in`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                          : 'bg-white/10 text-white/90 backdrop-blur-sm'
                      }`}
                      role="article"
                      aria-label={`${message.role === 'user' ? t('youSaid') : t('cosmoSaid')}`}
                    >
                      {message.content ? (
                        <>
                          <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
                          <p
                            className={`text-[10px] sm:text-xs mt-1 ${
                              message.role === 'user'
                                ? 'text-white/60'
                                : 'text-white/40'
                            }`}
                          >
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </>
                      ) : (
                        <div className="flex gap-1" aria-label={t('typing')}>
                          <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                          <span
                            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                            style={{ animationDelay: '0.1s' }}
                          />
                          <span
                            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          />
                          <span className="sr-only">{t('typing')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Input Area */}
        <footer className="border-t border-white/10 backdrop-blur-sm bg-white/5 safe-area-inset">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <form onSubmit={sendMessage} className="flex gap-2 sm:gap-3" role="search">
              <label htmlFor="chat-input" className="sr-only">{t('askAnything')}</label>
              <input
                id="chat-input"
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('askAnything')}
                className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                disabled={isLoading}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white text-sm sm:text-base font-medium transition-all min-w-[60px] sm:min-w-[80px]"
                aria-label={isLoading ? t('sending') : common('send')}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 sm:h-5 sm:w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="sr-only">{t('sending')}</span>
                  </span>
                ) : (
                  common('send')
                )}
              </button>
            </form>
          </div>
        </footer>
      </div>
    </div>
  );
}
