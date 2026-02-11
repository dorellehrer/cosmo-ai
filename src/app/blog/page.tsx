import Link from 'next/link';
import type { Metadata } from 'next';
import BlogContent from '@/components/blog/BlogContent';
import { NewsletterForm } from '@/components/blog/NewsletterForm';
import { PublicNav } from '@/components/PublicNav';
import { PublicFooter } from '@/components/PublicFooter';

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
  date: 'February 6, 2026',
  author: 'Nova Team',
  authorRole: '',
  readTime: '5 min read',
  category: 'Announcements',
  image: '🚀',
};

const posts = [
  {
    slug: 'privacy-first-ai',
    title: 'Why we built Nova with privacy as a foundation',
    excerpt: 'AI assistants need access to your most personal data. Here\'s how we built trust from day one.',
    date: 'February 6, 2026',
    author: 'Nova Team',
    readTime: '4 min read',
    category: 'Engineering',
    image: '🔐',
  },
  {
    slug: 'smart-home-integrations',
    title: 'Smart home automations we\'re building',
    excerpt: 'From "movie night mode" to "good morning routines" — here\'s our vision for smart home integration.',
    date: 'February 6, 2026',
    author: 'Nova Team',
    readTime: '6 min read',
    category: 'Roadmap',
    image: '💡',
  },
  {
    slug: 'the-action-layer',
    title: 'The Action Layer: How Nova bridges AI and reality',
    excerpt: 'A deep dive into the architecture that lets Nova safely take actions on your behalf.',
    date: 'February 6, 2026',
    author: 'Nova Team',
    readTime: '8 min read',
    category: 'Engineering',
    image: '⚙️',
  },
  {
    slug: 'calendar-productivity',
    title: 'Reclaim your calendar: AI-powered scheduling tips',
    excerpt: 'How to use natural language to take control of your schedule and never miss a meeting again.',
    date: 'February 6, 2026',
    author: 'Nova Team',
    readTime: '5 min read',
    category: 'Tips & Tricks',
    image: '📅',
  },
  {
    slug: 'future-of-ai-assistants',
    title: 'The future of AI assistants is action, not conversation',
    excerpt: 'Why the next generation of AI won\'t be about better chatbots — it\'ll be about getting things done.',
    date: 'February 6, 2026',
    author: 'Nova Team',
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
      <PublicNav />

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
            <NewsletterForm source="blog" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
