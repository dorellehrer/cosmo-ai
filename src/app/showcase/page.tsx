import Link from 'next/link';
import type { Metadata } from 'next';
import { PublicNav } from '@/components/PublicNav';
import { PublicFooter } from '@/components/PublicFooter';
import { ShowcaseContent } from '@/components/showcase/ShowcaseContent';

export const metadata: Metadata = {
  title: 'Showcase — Nova AI',
  description:
    'See what people are building with Nova. Real automations, real productivity, real magic.',
  openGraph: {
    title: 'Showcase — Nova AI',
    description:
      'See what people are building with Nova. Real automations, real productivity, real magic.',
  },
};

const categories = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'automation', label: 'Automation', icon: '⚡' },
  { id: 'productivity', label: 'Productivity', icon: '📋' },
  { id: 'smart-home', label: 'Smart Home', icon: '🏠' },
  { id: 'developer', label: 'Developer', icon: '💻' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'personal', label: 'Personal', icon: '👤' },
];

const showcaseItems = [
  {
    name: 'Marcus R.',
    handle: '@marcus_dev',
    category: 'automation',
    likes: 284,
    description:
      'I set up a morning routine that checks my calendar, reads unread emails, gives me a weather briefing, and starts my "Focus" playlist on Spotify. All from one message: "good morning."',
  },
  {
    name: 'Priya S.',
    handle: '@priya_builds',
    category: 'productivity',
    likes: 412,
    description:
      'Nova watches my Gmail for invoices, extracts the amounts and due dates, creates reminders in Apple Reminders, and adds payment deadlines to my calendar. Fully automated invoice tracking.',
  },
  {
    name: 'Johan L.',
    handle: '@johanl',
    category: 'smart-home',
    likes: 197,
    description:
      '"Movie night" dims my Hue lights to 20%, sets them to warm amber, pauses my Sonos music, and sends a message to my partner that movie time is starting. One sentence.',
  },
  {
    name: 'Sarah K.',
    handle: '@sarahk_pm',
    category: 'productivity',
    likes: 356,
    description:
      'Every Friday at 5pm, Nova pulls my completed tasks from Notion, drafts a weekly status update email, and sends it to my team on Slack. My weekend starts without admin work.',
  },
  {
    name: 'Alex T.',
    handle: '@alext_code',
    category: 'developer',
    likes: 523,
    description:
      'I use Nova\'s desktop app to search my codebase, explain error messages, and run shell commands. "Find all TODO comments in the src folder" → instant results with file paths.',
  },
  {
    name: 'Emma D.',
    handle: '@emmad',
    category: 'personal',
    likes: 189,
    description:
      'Nova manages my medication schedule. It creates reminders, tracks when I\'ve taken them, and even drafts a summary for my doctor appointments. Life-changing for chronic conditions.',
  },
  {
    name: 'Carlos M.',
    handle: '@carlosm_tech',
    category: 'automation',
    likes: 445,
    description:
      'Every morning at 8AM, Nova runs a local routine on my Mac: checks disk space, clears old downloads, runs my backup script, and sends me a system health report. Zero maintenance.',
  },
  {
    name: 'Yuki N.',
    handle: '@yuki_designs',
    category: 'creative',
    likes: 267,
    description:
      'I describe a design concept in natural language and Nova generates image variations with DALL-E, saves them to a folder on my Desktop, and creates a Notion page with the brief. Instant mood boards.',
  },
  {
    name: 'David W.',
    handle: '@davidw_ops',
    category: 'developer',
    likes: 312,
    description:
      'Nova monitors my production alerts via email, summarizes critical issues, and posts them to our #incidents Slack channel with severity tags. Cut our response time by 60%.',
  },
  {
    name: 'Lisa P.',
    handle: '@lisap_reads',
    category: 'personal',
    likes: 178,
    description:
      '"What should I read this weekend?" — Nova checks my Notion reading list, picks the top-rated unread book, finds reviews online, and creates a calendar block for Sunday reading time.',
  },
  {
    name: 'Raj K.',
    handle: '@rajk_auto',
    category: 'smart-home',
    likes: 234,
    description:
      'Set up a "leaving home" routine: Hue lights turn off, thermostat adjusts, Nova sends me a weather update and my commute ETA based on calendar location. Saves 5 minutes every morning.',
  },
  {
    name: 'Nina F.',
    handle: '@ninaf_writer',
    category: 'creative',
    likes: 291,
    description:
      'Nova is my writing assistant. It searches the web for research, summarizes articles, and creates Apple Notes with organized outlines. Then sets a 2-hour focus block on my calendar.',
  },
  {
    name: 'Tom H.',
    handle: '@tomh_freelance',
    category: 'productivity',
    likes: 388,
    description:
      'As a freelancer, I tell Nova "invoice Acme Corp for 40 hours at $150/hr" and it calculates the total, drafts an email with the breakdown, and creates a reminder for follow-up in 30 days.',
  },
  {
    name: 'Aisha M.',
    handle: '@aisham',
    category: 'automation',
    likes: 156,
    description:
      'Nova reads my kids\' school newsletter emails, extracts important dates, adds them to a shared family calendar, and creates reminders for things like picture day and field trips.',
  },
  {
    name: 'Ben C.',
    handle: '@benc_maker',
    category: 'developer',
    likes: 467,
    description:
      'Built a code review workflow: paste a PR link, Nova fetches the diff via web, analyzes changes, checks for common issues, and posts a structured review to the PR as a comment.',
  },
  {
    name: 'Mika S.',
    handle: '@mikas_fit',
    category: 'personal',
    likes: 203,
    description:
      'Nova tracks my workout routine. I say "just finished 5k in 24 minutes" and it logs it in my Notion fitness tracker, calculates my pace improvement, and sets tomorrow\'s goal.',
  },
  {
    name: 'Oliver R.',
    handle: '@oliverr_data',
    category: 'developer',
    likes: 334,
    description:
      'I use Nova to explore datasets. "Read sales_q4.csv from my Desktop and give me the top 10 customers by revenue" → instant analysis with the desktop app\'s file access.',
  },
  {
    name: 'Julia W.',
    handle: '@juliaw_travel',
    category: 'personal',
    likes: 245,
    description:
      'Planning trips with Nova is incredible. "Plan a 5-day trip to Tokyo" → it searches for travel tips, creates a day-by-day itinerary in Notion, and adds key events to my calendar.',
  },
];

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <PublicNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-6">
            {showcaseItems.length} use cases and counting
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            What people are building
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto">
            Real automations, real productivity, real magic. See how people use Nova to get things done.
          </p>
        </div>

        <ShowcaseContent items={showcaseItems} categories={categories} />

        {/* Bottom CTA */}
        <div className="mt-16 sm:mt-24 text-center">
          <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-white/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Built something cool?
            </h2>
            <p className="text-white/60 mb-8 max-w-lg mx-auto">
              Share your Nova setup with the community. We love seeing what you build.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/chat"
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold transition-all shadow-lg shadow-violet-500/25"
              >
                Start building with Nova
              </Link>
              <Link
                href="/contact"
                className="px-6 py-3 border border-white/20 hover:bg-white/10 rounded-full text-white font-semibold transition-all"
              >
                Share your story
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
