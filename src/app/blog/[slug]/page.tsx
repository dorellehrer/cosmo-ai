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
  'introducing-cosmo-ai': {
    title: 'Introducing Cosmo: AI that actually does things',
    excerpt: 'For years, AI has promised to change how we work. Today, we\'re taking a different approach.',
    date: 'February 1, 2026',
    author: 'Alex Chen',
    authorRole: 'Co-founder & CEO',
    readTime: '5 min read',
    category: 'Announcements',
    content: `
Today, we're excited to introduce Cosmo to the world.

## The Problem

For years, AI assistants have promised to revolutionize how we work and live. ChatGPT can write essays, generate code, and hold surprisingly human conversations. But ask it to schedule a meeting, and it politely explains that it can't. Ask it to turn off your lights, and you get a helpful explanation of what smart home devices are.

This is the gap we set out to close.

## Our Approach

Cosmo isn't trying to be a better chatbot. We're building something fundamentally different: an AI that bridges the gap between intention and action.

When you tell Cosmo "schedule lunch with Sarah tomorrow," it doesn't just acknowledge your request — it checks your calendar, finds available times, sends an invitation, and confirms when Sarah accepts. When you say "movie night mode," your lights dim, your TV turns on, and your favorite streaming app opens.

## Privacy First

We know that to be truly useful, Cosmo needs access to your most sensitive data — your emails, calendar, smart home devices, and more. That's why we built privacy into our foundation:

- **End-to-end encryption** for all your data
- **No data selling** — ever
- **No training on your data** — your conversations stay yours
- **Full data export and deletion** on demand

## What's Next

This is just the beginning. We're working on team features, more integrations, and capabilities we can't wait to share. But for now, we're focused on one thing: making Cosmo genuinely useful in your daily life.

Try Cosmo today — it's free to start.
    `.trim(),
  },
  'privacy-first-ai': {
    title: 'Why we built Cosmo with privacy as a foundation',
    excerpt: 'AI assistants need access to your most personal data. Here\'s how we built trust from day one.',
    date: 'January 28, 2026',
    author: 'Sarah Kim',
    authorRole: 'Co-founder & CTO',
    readTime: '4 min read',
    category: 'Engineering',
    content: `
When we started building Cosmo, we faced a fundamental tension: to be truly useful, an AI assistant needs deep access to your digital life. But that access requires trust.

## The Trust Problem

Think about what an AI assistant needs to know to be helpful:
- Your calendar and schedule
- Your emails and messages  
- Your smart home devices
- Your preferences and habits

This is sensitive data. And the track record of tech companies with personal data isn't great.

## Our Architecture

We designed Cosmo's architecture around a simple principle: minimize data exposure.

**Ephemeral Processing**: Your data is processed in memory and never written to disk. Once Cosmo completes an action, the data is gone.

**Zero-Knowledge Where Possible**: For many integrations, Cosmo uses delegated authentication. We never see your passwords.

**Local First**: Many operations happen on-device when possible, reducing what needs to travel to our servers.

## Certifications

We put our money where our mouth is:
- SOC 2 Type II certified
- GDPR compliant
- CCPA compliant
- Regular third-party security audits

## Your Data, Your Control

You can export all your data anytime. You can delete everything with one click. No retention periods, no gotchas.

This isn't just a feature — it's a promise.
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
    title: `${post.title} - Cosmo AI Blog`,
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
            <span className="text-lg sm:text-xl font-semibold text-white">Cosmo</span>
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
            <h3 className="text-xl font-bold text-white mb-3">Ready to try Cosmo?</h3>
            <p className="text-white/60 mb-6">
              Join thousands of users who&apos;ve made Cosmo part of their daily routine.
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
            <span className="text-white/60">© 2026 Cosmo AI. All rights reserved.</span>
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
