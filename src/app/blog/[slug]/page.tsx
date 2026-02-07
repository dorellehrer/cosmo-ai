import Link from 'next/link';
import type { Metadata } from 'next';

// This would come from a CMS or database in production
const posts: Record<string, {
  title: string;
  excerpt: string;
  date: string;
  author: string;
  authorRole: string;
  readTime: string;
  category: string;
  content: string;
}> = {
  'introducing-nova-ai': {
    title: 'Introducing Nova: AI that actually does things',
    excerpt: 'For years, AI has promised to change how we work. Today, we\'re taking a different approach.',
    date: 'February 6, 2026',
    author: 'Nova Team',
    authorRole: '',
    readTime: '5 min read',
    category: 'Announcements',
    content: `
Today, we're excited to introduce Nova to the world.

## The Problem

For years, AI assistants have promised to revolutionize how we work and live. ChatGPT can write essays, generate code, and hold surprisingly human conversations. But ask it to schedule a meeting, and it politely explains that it can't. Ask it to turn off your lights, and you get a helpful explanation of what smart home devices are.

This is the gap we set out to close.

## Our Approach

Nova isn't trying to be a better chatbot. We're building something fundamentally different: an AI that bridges the gap between intention and action.

When you tell Nova "schedule lunch with Sarah tomorrow," it checks your Google Calendar and creates the event. Connect Spotify and say "play some jazz" — Nova finds and plays it. These aren't hypothetical features — they work today.

## Privacy First

We know that to be truly useful, Nova needs access to your most sensitive data — your emails, calendar, smart home devices, and more. That's why we built privacy into our foundation:

- **End-to-end encryption** for all your data
- **No data selling** — ever
- **No training on your data** — your conversations stay yours
- **Full data export and deletion** on demand

## What's Next

This is just the beginning. We're working on team features, more integrations, and capabilities we can't wait to share. But for now, we're focused on one thing: making Nova genuinely useful in your daily life.

Try Nova today — it's free to start.
    `.trim(),
  },
  'privacy-first-ai': {
    title: 'Why we built Nova with privacy as a foundation',
    excerpt: 'AI assistants need access to your most personal data. Here\'s how we built trust from day one.',
    date: 'February 6, 2026',
    author: 'Nova Team',
    authorRole: '',
    readTime: '4 min read',
    category: 'Engineering',
    content: `
When we started building Nova, we faced a fundamental tension: to be truly useful, an AI assistant needs deep access to your digital life. But that access requires trust.

## The Trust Problem

Think about what an AI assistant needs to know to be helpful:
- Your calendar and schedule
- Your emails and messages  
- Your smart home devices
- Your preferences and habits

This is sensitive data. And the track record of tech companies with personal data isn't great.

## Our Architecture

We designed Nova's architecture around a simple principle: minimize data exposure.

**Ephemeral Processing**: Your data is processed in memory and never written to disk. Once Nova completes an action, the data is gone.

**Zero-Knowledge Where Possible**: For many integrations, Nova uses delegated authentication. We never see your passwords.

**Local First**: Many operations happen on-device when possible, reducing what needs to travel to our servers.

## What We've Built

Here's what's in place today:
- AES-256-GCM encryption for all integration tokens
- OAuth2 for secure third-party access
- Strict Content Security Policy and HSTS headers
- No training on your conversations — ever

## Your Data, Your Control

You can export all your data anytime. You can delete everything with one click. No retention periods, no gotchas.

This isn't just a feature — it's a promise.
    `.trim(),
  },
  'smart-home-integrations': {
    title: 'Smart home automations we\'re building',
    excerpt: 'From "movie night mode" to "good morning routines" — here\'s our vision for smart home integration.',
    date: 'February 6, 2026',
    author: 'Nova Team',
    authorRole: '',
    readTime: '6 min read',
    category: 'Roadmap',
    content: `
Your smart home devices are powerful, but managing them individually is tedious. We're building Nova to tie everything together with natural language. Here's what we're working on.

## Our Vision

Imagine controlling your entire smart home with a single sentence. That's what we're building toward with Nova's smart home integration.

## What We're Planning

Here are the automations we're designing:

**Movie Night Mode** — Say "movie night" and Nova dims the lights, pauses any playing music, and sets the mood.

**Good Morning Routine** — "Good morning" gradually brightens your lights, reads your calendar for the day, and plays your morning playlist.

**Focus Mode** — "Time to focus" sets lights to a cool white, plays lo-fi beats on your speakers, and blocks notifications.

**Bedtime Wind-Down** — "Getting ready for bed" dims all lights to warm tones and starts a sleep sounds playlist.

## Current Status

We're actively building Philips Hue and Sonos integration. The infrastructure is in place — what remains is connecting to the device APIs and building the control tools.

In the meantime, Nova already works with Google Calendar, Gmail, Spotify, Notion, and Slack. You can use these integrations today.

## What's Next

Smart home control is our next major milestone. We'll start with Philips Hue light control (on/off, brightness, color, scenes), then expand to Sonos multi-room audio.

Stay tuned for updates, or connect your existing integrations on the Integrations page to start using Nova today.
    `.trim(),
  },
  'the-action-layer': {
    title: 'The Action Layer: How Nova bridges AI and reality',
    excerpt: 'A deep dive into the architecture that lets Nova safely take actions on your behalf.',
    date: 'February 6, 2026',
    author: 'Nova Team',
    authorRole: '',
    readTime: '8 min read',
    category: 'Engineering',
    content: `
Most AI assistants stop at generating text. Nova goes further — it can actually do things in the real world. Here's how our Action Layer makes that possible.

## The Problem with Chat-Only AI

Large language models are incredible at understanding and generating text. But there's a fundamental gap between "I understand what you want" and "I'll do it for you." That gap is what we call the Action Layer.

## Architecture Overview

The Action Layer sits between Nova's AI brain and the outside world. It has three core components:

**Intent Recognition**: Nova parses your request and identifies not just what you want, but the specific actions required. "Schedule lunch with Sarah" becomes: check calendar → find mutual availability → create event → send invitation.

**Safety Sandbox**: Every action goes through a safety check before execution. Destructive actions (deleting files, sending money) require explicit confirmation. Read-only actions (checking calendar, reading emails) execute immediately.

**Integration Adapters**: Each connected service has a dedicated adapter that translates generic actions into service-specific API calls. The Google Calendar adapter handles scheduling, the Hue adapter handles lighting, and so on.

## How a Request Flows

1. You say: "Turn on the living room lights and play some jazz"
2. Intent Recognition identifies two actions: lights.on(room: living room) + music.play(genre: jazz)
3. Safety Sandbox classifies both as non-destructive → auto-approve
4. Hue adapter sends the API call to set living room lights to ON
5. Spotify adapter starts a jazz playlist
6. Nova confirms: "Living room lights are on and jazz is playing 🎶"

The entire flow takes under 2 seconds.

## Error Handling

Real-world integrations fail. APIs go down, tokens expire, devices go offline. The Action Layer handles this gracefully:

- **Retry with backoff**: Transient failures get 3 retries with exponential backoff
- **Graceful degradation**: If Spotify is down, Nova tells you and offers alternatives
- **Rollback**: If a multi-step action partially fails, completed steps are rolled back where possible

## What's Next

We're working on chaining actions into complex workflows, conditional logic ("if it's raining, skip the outdoor lights"), and user-defined custom actions. The Action Layer is designed to be extensible — adding new integrations is as simple as writing a new adapter.
    `.trim(),
  },
  'calendar-productivity': {
    title: 'Reclaim your calendar: AI-powered scheduling tips',
    excerpt: 'How to use natural language to take control of your schedule and never miss a meeting again.',
    date: 'February 6, 2026',
    author: 'Nova Team',
    authorRole: '',
    readTime: '5 min read',
    category: 'Tips & Tricks',
    content: `
Your calendar shouldn't be a source of stress. With Nova, managing your schedule is as easy as having a conversation. Here are our top tips.

## Natural Language Scheduling

Forget clicking through date pickers and time slots. Just tell Nova what you need:

- "Schedule a team standup every weekday at 9am"
- "Move my 2pm meeting to Thursday"
- "Find 30 minutes for a coffee chat with Alex this week"
- "Block off Friday afternoons for deep work"

Nova understands context, relative dates, and recurring patterns.

## Smart Conflict Detection

Double-booked? Nova catches conflicts before they happen. When you say "Schedule lunch with Sarah tomorrow at noon," and you already have a meeting at that time, Nova will suggest alternatives: "You have a product review at noon. How about 12:30 or 1pm?"

## Time Zone Intelligence

Working with global teams? Nova handles time zones automatically. "Schedule a call with the London team at a time that works for both" will find overlapping business hours and suggest optimal slots.

## Meeting Prep

Before each meeting, Nova can:

- Summarize the last meeting notes with that person
- Pull relevant documents and links
- Prepare a brief agenda based on recent communication
- Send a reminder 15 minutes before

## Protect Your Focus Time

Tell Nova "I need 2 hours of uninterrupted work every morning" and it will:

- Block the time on your calendar
- Decline or reschedule conflicting invitations
- Set your status to "Focus Time"
- Pause notifications during that window

## Weekly Review

Every Sunday, ask Nova "What does my week look like?" and get a clear summary of upcoming meetings, deadlines, and free time. Perfect for planning ahead.

## Getting Started

Connect your Google Calendar in the Integrations page, and start scheduling with natural language. Nova learns your preferences over time — the more you use it, the smarter it gets.
    `.trim(),
  },
  'future-of-ai-assistants': {
    title: 'The future of AI assistants is action, not conversation',
    excerpt: 'Why the next generation of AI won\'t be about better chatbots — it\'ll be about getting things done.',
    date: 'February 6, 2026',
    author: 'Nova Team',
    authorRole: '',
    readTime: '7 min read',
    category: 'Thoughts',
    content: `
We've entered an interesting moment in AI. Large language models can hold conversations that are nearly indistinguishable from humans. But is conversation really what we need from AI?

## The Conversation Trap

The AI industry has been captivated by conversation. And rightfully so — the progress is remarkable. But I think we've conflated the ability to talk with the ability to help.

When you ask a friend to help you move, you don't want them to have a thoughtful conversation about moving strategies. You want them to show up with a truck.

## Action as the Interface

What if AI's primary interface wasn't conversation, but action? What if instead of chatting with your AI about your schedule, your AI just managed it? Instead of asking about the weather, your AI adjusted your thermostat and suggested an umbrella?

This is the shift we're building toward at Nova. Conversation is the input method, but action is the output.

## The Trust Barrier

The reason this hasn't happened yet is trust. Giving an AI permission to act on your behalf requires a level of trust that no company has fully earned. You need:

- **Transparency**: You should always know what actions are being taken
- **Control**: You should always be able to override or undo
- **Privacy**: Your data should never be used for anything except helping you
- **Reliability**: The system needs to work correctly, every time

We're building all four of these principles into Nova's foundation.

## The Compound Effect

Individual actions save seconds. But compound them over days, weeks, months, and the impact is transformative. Imagine:

- Never manually scheduling a meeting again
- Never forgetting to follow up on an email
- Never wondering if you locked the front door
- Never missing a birthday or anniversary

Each of these is a small convenience. Together, they fundamentally change your relationship with technology — from managing tools to being supported by an intelligent system.

## What This Means for the Industry

I believe the next billion-dollar AI companies won't be the ones with the best conversation. They'll be the ones that best bridge the gap between intention and action.

The future of AI isn't a better chatbot. It's an AI that does things for you.

That's what we're building with Nova.
    `.trim(),
  },
};

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];
  
  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: `${post.title} - Nova AI Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Post not found</h1>
          <Link href="/blog" className="text-violet-400 hover:text-violet-300">
            ← Back to blog
          </Link>
        </div>
      </div>
    );
  }

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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
        >
          <span>←</span> Back to blog
        </Link>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-sm font-medium">
              {post.category}
            </span>
            <span className="text-white/40 text-sm">{post.date}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {post.title}
          </h1>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-xl">
              👤
            </div>
            <div>
              <div className="text-white font-medium">{post.author}</div>
              <div className="text-white/40 text-sm">{post.authorRole} · {post.readTime}</div>
            </div>
          </div>
        </header>

        {/* Content */}
        <article className="prose prose-invert prose-lg max-w-none">
          {post.content.split('\n\n').map((paragraph, i) => {
            if (paragraph.startsWith('## ')) {
              return (
                <h2 key={i} className="text-2xl font-bold text-white mt-12 mb-6">
                  {paragraph.replace('## ', '')}
                </h2>
              );
            }
            if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
              return (
                <p key={i} className="text-white/80 leading-relaxed mb-6 font-semibold">
                  {paragraph.replace(/\*\*/g, '')}
                </p>
              );
            }
            if (paragraph.startsWith('- ')) {
              const items = paragraph.split('\n').filter(line => line.startsWith('- '));
              return (
                <ul key={i} className="list-disc list-inside text-white/70 mb-6 space-y-2">
                  {items.map((item, j) => (
                    <li key={j}>{item.replace('- ', '')}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i} className="text-white/70 leading-relaxed mb-6">
                {paragraph}
              </p>
            );
          })}
        </article>

        {/* Share & CTA */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-white/10 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-3">Ready to try Nova?</h3>
            <p className="text-white/60 mb-6">
              Try Nova today and see what AI can actually do for you.
            </p>
            <Link
              href="/sign-up"
              className="inline-block px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold transition-all"
            >
              Get started free
            </Link>
          </div>
        </div>
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
              <Link href="/" className="hover:text-white/60">Home</Link>
              <Link href="/about" className="hover:text-white/60">About</Link>
              <Link href="/blog" className="hover:text-white/60">Blog</Link>
            </div>
          </nav>
        </div>
      </footer>
    </div>
  );
}
