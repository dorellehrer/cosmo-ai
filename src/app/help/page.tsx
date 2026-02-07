'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

type FAQCategory = {
  id: string;
  name: string;
  icon: string;
  questions: { q: string; a: string }[];
};

const faqCategories: FAQCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: '🚀',
    questions: [
      {
        q: 'How do I create a Nova account?',
        a: 'Creating an account is easy! Click "Get started" on the homepage, enter your email address, choose a password, and you\'re ready to go. You can also sign up with your Google account for faster access.',
      },
      {
        q: 'Is Nova free to use?',
        a: 'Yes! Nova offers a free tier with 50 messages per day. For unlimited usage and premium features, you can upgrade to our Pro plan at $20/month.',
      },
      {
        q: 'What devices can I use Nova on?',
        a: 'Nova works on any device with a modern web browser — desktop, laptop, tablet, or phone. We\'re also working on native mobile apps for iOS and Android, coming soon!',
      },
      {
        q: 'How do I connect my other accounts to Nova?',
        a: 'Go to Settings > Connected Services and click "Connect" next to the service you want to integrate (Google, Spotify, Philips Hue, etc.). Follow the authentication prompts to grant Nova access.',
      },
    ],
  },
  {
    id: 'account',
    name: 'Account & Billing',
    icon: '👤',
    questions: [
      {
        q: 'How do I change my password?',
        a: 'Go to Settings > Profile and click "Change password." You\'ll need to enter your current password and then your new password twice to confirm.',
      },
      {
        q: 'How do I upgrade to Pro?',
        a: 'Visit our Pricing page or go to Settings and click "Upgrade to Pro." You can pay monthly or save with an annual subscription. We accept all major credit cards.',
      },
      {
        q: 'Can I cancel my subscription?',
        a: 'Yes, you can cancel anytime from Settings > Subscription > Cancel. You\'ll keep Pro access until the end of your current billing period. No questions asked!',
      },
      {
        q: 'How do I get a refund?',
        a: 'We offer a 7-day money-back guarantee for new Pro subscribers. Contact support@heynova.se within 7 days of your first payment for a full refund.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Go to Settings > Danger Zone > Delete Account. This will permanently delete your account, conversations, and all connected integrations. This action cannot be undone.',
      },
    ],
  },
  {
    id: 'features',
    name: 'Features & Usage',
    icon: '✨',
    questions: [
      {
        q: 'What can Nova do?',
        a: 'Nova can help with email management, calendar scheduling, smart home control, music playback, reminders, general questions, research, writing assistance, and much more. Just ask naturally!',
      },
      {
        q: 'How do I control my smart home with Nova?',
        a: 'First, connect your smart home accounts (like Philips Hue) in Settings. Then simply tell Nova what you want: "Turn on the living room lights," "Set bedroom lights to 50%," or "Movie night mode."',
      },
      {
        q: 'Can Nova send emails for me?',
        a: 'Yes! Connect your Gmail account and Nova can draft, send, and manage emails. Say "Email John about tomorrow\'s meeting" or "Check my unread emails" to get started.',
      },
      {
        q: 'Does Nova support voice input?',
        a: 'Yes! Click the microphone button in the chat interface to speak your request. Nova also supports voice responses — enable them in Settings > Preferences.',
      },
      {
        q: 'Can I access my conversation history?',
        a: 'Absolutely! All your conversations are saved and accessible from the sidebar. You can search through past conversations and pick up where you left off.',
      },
    ],
  },
  {
    id: 'privacy',
    name: 'Privacy & Security',
    icon: '🔐',
    questions: [
      {
        q: 'Is my data safe with Nova?',
        a: 'Yes! We use industry-standard encryption (TLS 1.3 in transit, AES-256 at rest) and never sell your data. See our Privacy Policy for full details.',
      },
      {
        q: 'Does Nova use my data to train AI?',
        a: 'No, we do not use your personal conversations to train AI models without explicit consent. Your conversations are yours.',
      },
      {
        q: 'Can I export my data?',
        a: 'Yes! Go to Settings > Privacy > Export Data. You\'ll receive a download link with all your data in a machine-readable format within 24 hours.',
      },
      {
        q: 'What data does Nova access from connected services?',
        a: 'Nova only accesses what\'s needed to perform your requests. For example, for calendar integration, we access your events but not unrelated Google Drive files. You can revoke access anytime.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    icon: '🔧',
    questions: [
      {
        q: 'Nova isn\'t responding. What should I do?',
        a: 'Try refreshing the page first. If the issue persists, check our status page at status.heynova.se. You can also try clearing your browser cache or using a different browser.',
      },
      {
        q: 'My integration isn\'t working properly.',
        a: 'Go to Settings > Connected Services, disconnect the problematic service, and reconnect it. Make sure you\'ve granted all necessary permissions. If issues persist, contact support.',
      },
      {
        q: 'I\'m getting an error message. What does it mean?',
        a: 'Most errors are temporary. Try your request again in a few seconds. If you see a specific error code, check our status page or contact support with the error details.',
      },
      {
        q: 'Voice input isn\'t working.',
        a: 'Make sure your browser has microphone permissions for heynova.se. Check Settings > Site Settings > Microphone in your browser. Also ensure no other app is using the microphone.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'Click "Sign in" then "Forgot password" below the login form. Enter your email address and we\'ll send you a password reset link within minutes.',
      },
    ],
  },
];

const gettingStartedSteps = [
  {
    step: 1,
    title: 'Create your account',
    description: 'Sign up with your email or Google account. It takes less than 30 seconds.',
    icon: '📝',
  },
  {
    step: 2,
    title: 'Connect your services',
    description: 'Link your calendar, email, music, and smart home accounts to unlock Nova\'s full potential.',
    icon: '🔗',
  },
  {
    step: 3,
    title: 'Start chatting',
    description: 'Just type or speak naturally. Nova understands context and learns your preferences over time.',
    icon: '💬',
  },
  {
    step: 4,
    title: 'Discover features',
    description: 'Try different commands, explore integrations, and let Nova handle your daily tasks.',
    icon: '✨',
  },
];

function AccordionItem({ question, answer, isOpen, onClick }: { question: string; answer: string; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full py-4 px-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-white font-medium pr-4">{question}</span>
        <svg
          className={`w-5 h-5 text-white/60 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-5 pb-4">
          <p className="text-white/70 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  // Filter questions based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return faqCategories;
    
    const query = searchQuery.toLowerCase();
    return faqCategories.map(category => ({
      ...category,
      questions: category.questions.filter(
        q => q.q.toLowerCase().includes(query) || q.a.toLowerCase().includes(query)
      ),
    })).filter(category => category.questions.length > 0);
  }, [searchQuery]);

  const displayCategories = selectedCategory
    ? filteredCategories.filter(c => c.id === selectedCategory)
    : filteredCategories;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-lg sm:text-xl">✨</span>
            </div>
            <span className="text-lg sm:text-xl font-semibold text-white">Nova</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/sign-in"
              className="px-3 sm:px-5 py-2 text-sm sm:text-base text-white/70 hover:text-white font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="px-4 sm:px-5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white text-sm sm:text-base font-medium transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 mb-6">
            <span className="text-3xl">📚</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Help Center
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto mb-8">
            Find answers to common questions, learn how to use Nova, and get the most out of your AI assistant.
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Getting Started Guide */}
        {!searchQuery && !selectedCategory && (
          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-white mb-6">Getting Started with Nova</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {gettingStartedSteps.map((step) => (
                <div
                  key={step.step}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 relative"
                >
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold">
                    {step.step}
                  </div>
                  <div className="text-3xl mb-3">{step.icon}</div>
                  <h3 className="text-white font-medium mb-2">{step.title}</h3>
                  <p className="text-white/60 text-sm">{step.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category Filter */}
        {!searchQuery && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !selectedCategory
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              All Topics
            </button>
            {faqCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                <span>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        )}

        {/* FAQ Sections */}
        <div className="space-y-8">
          {displayCategories.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
              <p className="text-white/60 mb-6">
                We couldn&apos;t find any answers matching &quot;{searchQuery}&quot;
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full text-white font-medium"
              >
                Contact Support
              </Link>
            </div>
          ) : (
            displayCategories.map((category) => (
              <div key={category.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <h2 className="text-lg font-semibold text-white">{category.name}</h2>
                  <span className="ml-auto text-white/40 text-sm">{category.questions.length} questions</span>
                </div>
                <div>
                  {category.questions.map((item, index) => (
                    <AccordionItem
                      key={index}
                      question={item.q}
                      answer={item.a}
                      isOpen={openQuestion === `${category.id}-${index}`}
                      onClick={() => setOpenQuestion(openQuestion === `${category.id}-${index}` ? null : `${category.id}-${index}`)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Still Need Help */}
        <section className="mt-16">
          <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Still need help?</h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Can&apos;t find what you&apos;re looking for? Our support team is here to help you 24/7.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold transition-all"
              >
                Contact Support
              </Link>
              <a
                href="mailto:support@heynova.se"
                className="px-6 py-3 border border-white/20 hover:bg-white/10 rounded-full text-white font-semibold transition-all"
              >
                Email us directly
              </a>
            </div>
          </div>
        </section>

        {/* Popular Resources */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold text-white mb-6">Popular Resources</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/about"
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all group"
            >
              <div className="text-2xl mb-3">🌟</div>
              <h3 className="text-white font-medium group-hover:text-violet-300 transition-colors">About Nova</h3>
              <p className="text-white/60 text-sm mt-1">Learn about our mission and team</p>
            </Link>
            <Link
              href="/pricing"
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all group"
            >
              <div className="text-2xl mb-3">💰</div>
              <h3 className="text-white font-medium group-hover:text-violet-300 transition-colors">Pricing Plans</h3>
              <p className="text-white/60 text-sm mt-1">Compare Free vs Pro features</p>
            </Link>
            <Link
              href="/blog"
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all group"
            >
              <div className="text-2xl mb-3">📖</div>
              <h3 className="text-white font-medium group-hover:text-violet-300 transition-colors">Blog & Updates</h3>
              <p className="text-white/60 text-sm mt-1">Latest news and feature releases</p>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-sm">✨</span>
            </div>
            <span className="text-white/60">© 2026 Nova AI. All rights reserved.</span>
          </div>
          <nav>
            <div className="flex gap-6 text-white/40 text-sm">
              <Link href="/privacy" className="hover:text-white/60">Privacy</Link>
              <Link href="/terms" className="hover:text-white/60">Terms</Link>
              <Link href="/cookies" className="hover:text-white/60">Cookies</Link>
              <Link href="/contact" className="hover:text-white/60">Contact</Link>
              <Link href="/help" className="hover:text-white/60">Help</Link>
            </div>
          </nav>
        </div>
      </footer>
    </div>
  );
}
