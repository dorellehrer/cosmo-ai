'use client';

import { useState, useEffect } from 'react';

const demoMessages = [
  { type: 'user', text: 'Check my calendar for tomorrow' },
  { type: 'assistant', text: 'You have 3 meetings tomorrow:\n\n• 9:00 AM - Standup\n• 11:30 AM - Design Review\n• 2:00 PM - Client Call\n\nWant me to add anything?' },
  { type: 'user', text: 'Move the client call to 3pm' },
  { type: 'assistant', text: '✅ Done! I\'ve rescheduled your client call to 3:00 PM and sent updated invites to all attendees.' },
];

function TypingIndicator() {
  return (
    <div className="flex gap-1">
      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export function HeroDemo() {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (visibleMessages >= demoMessages.length) {
      // Reset after showing all messages
      const resetTimer = setTimeout(() => {
        setVisibleMessages(0);
      }, 4000);
      return () => clearTimeout(resetTimer);
    }

    // Show typing indicator before assistant messages
    const currentMessage = demoMessages[visibleMessages];
    const delay = currentMessage?.type === 'assistant' ? 1500 : 1000;

    if (currentMessage?.type === 'assistant') {
      setIsTyping(true);
      const typingTimer = setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(typingTimer);
    } else {
      const timer = setTimeout(() => {
        setVisibleMessages((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [visibleMessages]);

  return (
    <div className="w-full max-w-lg mx-auto mt-8 sm:mt-12">
      {/* Browser-like frame */}
      <div className="bg-slate-800/80 rounded-t-xl border border-white/10 border-b-0 p-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 bg-slate-700/50 rounded-md px-4 py-1 text-sm text-white/40 text-center">
          heynova.se/chat
        </div>
      </div>

      {/* Chat interface */}
      <div className="bg-slate-900/90 rounded-b-xl border border-white/10 border-t-0 p-4 min-h-[280px] sm:min-h-[320px]">
        <div className="space-y-4">
          {demoMessages.slice(0, visibleMessages).map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-br-md'
                    : 'bg-white/10 text-white/90 rounded-bl-md'
                }`}
              >
                {message.text.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < message.text.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                <TypingIndicator />
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2.5">
            <span className="text-white/40 text-sm">Message Nova...</span>
            <div className="ml-auto w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <span className="text-white text-sm">↑</span>
            </div>
          </div>
        </div>
      </div>

      {/* Play indicator */}
      <div className="text-center mt-4">
        <span className="text-white/40 text-xs flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live demo — watch Nova in action
        </span>
      </div>
    </div>
  );
}
