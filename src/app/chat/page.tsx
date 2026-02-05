'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Cosmo</h1>
            <p className="text-xs text-white/60">Your AI companion</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6 animate-pulse">
                <span className="text-4xl">✨</span>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Hey, I&apos;m Cosmo
              </h2>
              <p className="text-white/60 max-w-md">
                Your personal AI assistant. I can help you with tasks, answer
                questions, and make your life easier. What would you like to do
                today?
              </p>
              <div className="flex flex-wrap gap-2 mt-8 justify-center">
                {[
                  '📧 Check my emails',
                  '📅 What&apos;s on my calendar?',
                  '💡 Turn on the lights',
                  '🎵 Play some music',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion.replace(/&apos;/g, "'"))}
                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
                  >
                    {suggestion.replace(/&apos;/g, "'")}
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
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm">
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
                  </div>
                </div>
              )}
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
              Send
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
