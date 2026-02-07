'use client';

import Link from 'next/link';
import { useState } from 'react';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  authorRole?: string;
  readTime: string;
  category: string;
  image: string;
}

interface BlogCategory {
  name: string;
  count: number;
}

export default function BlogContent({
  featuredPost,
  posts,
  categories,
}: {
  featuredPost: BlogPost;
  posts: BlogPost[];
  categories: BlogCategory[];
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredPosts = selectedCategory === 'All'
    ? posts
    : posts.filter((p) => p.category === selectedCategory);

  const showFeatured = selectedCategory === 'All' || featuredPost.category === selectedCategory;

  return (
    <>
      {/* Categories */}
      <section className="pb-12">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                category.name === selectedCategory
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {category.name}
              <span className="ml-2 text-white/40">({category.count})</span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Post */}
      {showFeatured && (
        <section className="pb-16">
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="block bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-white/10 rounded-2xl p-8 sm:p-12 hover:bg-white/5 transition-all group"
          >
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-5xl sm:text-6xl shrink-0">
                {featuredPost.image}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-xs font-medium">
                    {featuredPost.category}
                  </span>
                  <span className="text-white/40 text-sm">{featuredPost.date}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 group-hover:text-violet-300 transition-colors">
                  {featuredPost.title}
                </h2>
                <p className="text-white/60 mb-4 line-clamp-2">{featuredPost.excerpt}</p>
                <div className="flex items-center gap-4">
                  <span className="text-white/80 text-sm">{featuredPost.author}</span>
                  <span className="text-white/40">•</span>
                  <span className="text-white/40 text-sm">{featuredPost.readTime}</span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Post Grid */}
      <section className="pb-24">
        <h2 className="text-2xl font-bold text-white mb-8">Latest Posts</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-2xl mb-4">
                {post.image}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-white/10 text-white/60 rounded text-xs">
                  {post.category}
                </span>
                <span className="text-white/40 text-xs">{post.date}</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors line-clamp-2">
                {post.title}
              </h3>
              <p className="text-white/50 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">{post.author}</span>
                <span className="text-white/40">{post.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
