'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for new chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        router.push('/chat');
      }
      // Cmd/Ctrl + B for toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

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

    if (!confirm('Delete this conversation?')) return;

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
            ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
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

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/10">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-white font-medium transition-all shadow-lg shadow-violet-500/25"
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
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.id}`}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      currentConversationId === conv.id
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.title || conv.messages?.[0]?.content?.slice(0, 30) || 'New Chat'}
                        {!conv.title && conv.messages?.[0]?.content && conv.messages[0].content.length > 30 && '...'}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {formatDate(conv.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-red-400"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-white/10">
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all"
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
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
          <div className="px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {currentTitle || 'Cosmo'}
                </h1>
                <p className="text-xs text-white/60">
                  {currentTitle ? 'Your AI companion' : 'New conversation'}
                </p>
              </div>
            </Link>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {loadingChat ? (
              <div className="space-y-4 animate-pulse">
                {/* Loading skeleton for messages */}
                <div className="flex justify-end">
                  <div className="w-2/3 h-16 bg-white/10 rounded-2xl" />
                </div>
                <div className="flex justify-start">
                  <div className="w-3/4 h-24 bg-white/10 rounded-2xl" />
                </div>
                <div className="flex justify-end">
                  <div className="w-1/2 h-12 bg-white/10 rounded-2xl" />
                </div>
                <div className="flex justify-start">
                  <div className="w-2/3 h-20 bg-white/10 rounded-2xl" />
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6 animate-pulse">
                  <span className="text-4xl">✨</span>
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Hey, I&apos;m Cosmo
                </h2>
                <p className="text-white/60 max-w-md mb-8">
                  Your personal AI assistant. I can help you with tasks, answer
                  questions, and make your life easier. What would you like to do
                  today?
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    '📧 Check my emails',
                    '📅 What\'s on my calendar?',
                    '💡 Turn on the lights',
                    '🎵 Play some music',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                          : 'bg-white/10 text-white/90 backdrop-blur-sm'
                      }`}
                    >
                      {message.content ? (
                        <>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
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
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                          <span
                            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                            style={{ animationDelay: '0.1s' }}
                          />
                          <span
                            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          />
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
        <footer className="border-t border-white/10 backdrop-blur-sm bg-white/5">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <form onSubmit={sendMessage} className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Cosmo anything..."
                className="flex-1 bg-white/10 border border-white/20 rounded-full px-5 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white font-medium transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
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
                  </span>
                ) : (
                  'Send'
                )}
              </button>
            </form>
          </div>
        </footer>
      </div>
    </div>
  );
}
