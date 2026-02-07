'use client';

import { useState } from 'react';

const faqs = [
  {
    question: 'How is Nova different from ChatGPT?',
    answer:
      "ChatGPT is great at conversation, but it can't take real actions. Nova connects to your services — Google Calendar, Gmail, Spotify, Notion, Slack — and takes action on your behalf. Say 'schedule a meeting' and it creates the event. Say 'what's playing on Spotify' and it checks for you.",
  },
  {
    question: 'Is my data safe with Nova?',
    answer:
      "Absolutely. We're privacy-first by design. Your integration tokens are encrypted with AES-256-GCM, we use OAuth2 for all third-party access, we never sell your data, and we don't use your conversations to train models. You can delete your account and all data anytime.",
  },
  {
    question: 'What services does Nova integrate with?',
    answer:
      'Nova currently works with Google (Calendar, Gmail, Drive), Spotify, Notion, and Slack. Smart home integrations (Philips Hue, Sonos) are coming soon. We\'re actively adding new integrations based on user requests.',
  },
  {
    question: 'Is there a free plan?',
    answer:
      "Yes! Nova's free tier includes basic integrations and up to 50 messages per day. Our Pro plan ($20/month) unlocks unlimited messages and all integrations.",
  },
  {
    question: 'Can Nova learn my preferences?',
    answer:
      "Nova maintains conversation context within your sessions and connects to your real services, so it can give you personalized answers based on your actual calendar, emails, and music. We're actively building longer-term memory features.",
  },
  {
    question: 'Does Nova work offline?',
    answer:
      "Nova requires an internet connection for most features since it needs to communicate with your connected services. However, we're working on offline mode for basic tasks and will announce it soon.",
  },
  {
    question: 'How do I get started?',
    answer:
      "Just sign up — it takes 30 seconds. No credit card required for the free tier. Connect your first service (we recommend starting with email or calendar), and start chatting. Nova will guide you through setup and suggest helpful automations.",
  },
  {
    question: 'Can I use Nova for my team or business?',
    answer:
      "Yes! Nova for Teams is coming Q2 2026. It includes shared workspaces, team-wide integrations, admin controls, and enterprise SSO. Join the waitlist to be notified when it launches.",
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
