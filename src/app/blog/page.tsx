import Link from 'next/link';
import type { Metadata } from 'next';
import BlogContent from '@/components/blog/BlogContent';

export const metadata: Metadata = {
  title: 'Blog — Nova AI',
  description:
    'Updates, insights, and stories from the Nova team. Learn about AI, productivity, and the future of personal assistants.',
  openGraph: {
    title: 'Blog — Nova AI',
    description:
      'Updates, insights, and stories from the Nova team. Learn about AI, productivity, and the future of personal assistants.',
  },
};

const featuredPost = {
  slug: 'introducing-nova-ai',
  title: 'Introducing Nova: AI that actually does things',
  excerpt: 'For years, AI has promised to change how we work. Today, we\'re taking a different approach — building AI that takes real actions in the real world.',
  date: 'February 1, 2026',
  author: 'Alex Chen',
  authorRole: 'Co-founder & CEO',
  readTime: '5 min read',
  category: 'Announcements',
  image: '🚀',
};

const posts = [
  {
    slug: 'privacy-first-ai',
    title: 'Why we built Nova with privacy as a foundation',
    excerpt: 'AI assistants need access to your most personal data. Here\'s how we built trust from day one.',
    date: 'January 28, 2026',
    author: 'Sarah Kim',
    readTime: '4 min read',
    category: 'Engineering',
    image: '🔐',
  },
  {
    slug: 'smart-home-integrations',
    title: '10 smart home automations you didn\'t know you needed',
    excerpt: 'From "movie night mode" to "good morning routines" — here\'s how our users are using Nova.',
    date: 'January 22, 2026',
    author: 'Marcus Johnson',
    readTime: '6 min read',
    category: 'Tips & Tricks',
    image: '💡',
  },
  {
    slug: 'the-action-layer',
    title: 'The Action Layer: How Nova bridges AI and reality',
    excerpt: 'A deep dive into the architecture that lets Nova safely take actions on your behalf.',
    date: 'January 15, 2026',
    author: 'Sarah Kim',
    readTime: '8 min read',
    category: 'Engineering',
    image: '⚙️',
  },
  {
    slug: 'calendar-productivity',
    title: 'Reclaim your calendar: AI-powered scheduling tips',
    excerpt: 'How to use natural language to take control of your schedule and never miss a meeting again.',
    date: 'January 10, 2026',
    author: 'Emma Rodriguez',
    readTime: '5 min read',
    category: 'Tips & Tricks',
    image: '📅',
  },
  {
    slug: 'future-of-ai-assistants',
    title: 'The future of AI assistants is action, not conversation',
    excerpt: 'Why the next generation of AI won\'t be about better chatbots — it\'ll be about getting things done.',
    date: 'January 5, 2026',
    author: 'Alex Chen',
    readTime: '7 min read',
    category: 'Thoughts',
    image: '🔮',
  },
];

const categories = [
  { name: 'All', count: 6 },
  { name: 'Announcements', count: 1 },
  { name: 'Engineering', count: 2 },
  { name: 'Tips & Tricks', count: 2 },
  { name: 'Thoughts', count: 1 },
];

export default function BlogPage() {
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <section className="pt-16 sm:pt-24 pb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Blog</h1>
          <p className="text-lg text-white/60 max-w-2xl">
            Updates, insights, and stories from the Nova team. Learn about AI, productivity, 
            and the future of personal assistants.
          </p>
        </section>

        {/* Interactive content (client component) */}
        <BlogContent
          featuredPost={featuredPost}
          posts={posts}
          categories={categories}
        />

        {/* Newsletter CTA */}
        <section className="pb-24">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="text-2xl font-bold text-white mb-3">Subscribe to our newsletter</h2>
            <p className="text-white/60 mb-6 max-w-lg mx-auto">
              Get the latest posts, product updates, and AI insights delivered to your inbox.
            </p>
            <form className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold transition-all"
              >
                Subscribe
              </button>
            </form>
            <p className="text-white/40 text-xs mt-4">No spam, ever. Unsubscribe anytime.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-sm">✨</span>
            </div>
            <span className="text-white/60">© 2026 Nova AI. All rights reserved.</span>
          </div>
          <nav>
            <div className="flex flex-wrap gap-4 sm:gap-6 text-white/40 text-sm">
              <Link href="/" className="hover:text-white/60">Home</Link>
              <Link href="/about" className="hover:text-white/60">About</Link>
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
