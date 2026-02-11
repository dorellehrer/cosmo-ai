'use client';

import { useState } from 'react';

const faqs = [
  {
    question: 'How is Nova different from ChatGPT?',
    answer:
      "ChatGPT answers questions. Nova actually does things. It connects to your email, calendar, Spotify, WhatsApp, Slack, Discord, and Notion — and takes action on your behalf. Say \"schedule lunch with Sarah\" and it creates the event. Say \"call mom\" and it makes a real phone call.",
  },
  {
    question: 'Is Nova really free?',
    answer:
      "Yes! You get 20 free credits when you sign up — no credit card required. Every message uses credits, starting at just 1 credit for Standard. When you need smarter answers (like for complex research or creative writing), higher power levels cost more credits per message.",
  },
  {
    question: 'What are power levels and credits?',
    answer:
      "Think of it like choosing a flight class. Standard (1 credit) handles everyday questions. Advanced, Creative, Max, and Genius use increasingly powerful AI for harder tasks — each costs more credits per message. Buy credits when you need them, or get Pro ($20/month) which includes 1,000 credits plus all integrations.",
  },
  {
    question: 'What can Nova connect to?',
    answer:
      "Google (Calendar, Gmail, Drive), Spotify, WhatsApp, Slack, Discord, and Notion — with more coming soon. Connect your accounts in Settings and Nova can read your emails, manage your calendar, send messages, and control your music.",
  },
  {
    question: 'Can Nova really make phone calls?',
    answer:
      "Yes! Nova can call any phone number with a natural-sounding voice, have a real conversation, and report back with a summary of what was said. It costs $0.10 per minute — great for quick calls like \"tell mom I'll be late.\"",
  },
  {
    question: 'Is my data safe?',
    answer:
      "Absolutely. Your data is encrypted, we never sell it, and we never use your conversations to train AI. You can delete your account and all data at any time. We use the same security standards as banks.",
  },
  {
    question: 'What devices does Nova work on?',
    answer:
      "Everything. Use Nova in your browser at heynova.se, download the desktop app for Mac or PC (which can access your local files and take screenshots), or install it on your phone as an app. Your conversations sync across all devices.",
  },
  {
    question: 'How do I get started?',
    answer:
      "Sign up in 30 seconds — no credit card needed. You get 20 free credits to start chatting right away. When you're ready, connect your first service (we recommend Gmail or Spotify) to unlock Nova's real power.",
  },
];

function AccordionItem({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full py-5 px-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-white font-medium pr-8">{question}</span>
        <span
          className={`text-violet-400 text-xl transition-transform duration-200 ${
            isOpen ? 'rotate-45' : ''
          }`}
          aria-hidden="true"
        >
          +
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="px-6 pb-5 text-white/60 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24"
      aria-labelledby="faq-heading"
    >
      <div className="text-center mb-12">
        <h2
          id="faq-heading"
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          Frequently asked questions
        </h2>
        <p className="text-white/60 text-lg">
          Everything you need to know about Nova
        </p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        {faqs.map((faq, index) => (
          <AccordionItem
            key={index}
            question={faq.question}
            answer={faq.answer}
            isOpen={openIndex === index}
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          />
        ))}
      </div>

      <div className="text-center mt-8">
        <p className="text-white/60">
          Still have questions?{' '}
          <a
            href="mailto:hello@heynova.se"
            className="text-violet-400 hover:text-violet-300 underline"
          >
            Get in touch
          </a>
        </p>
      </div>
    </section>
  );
}
