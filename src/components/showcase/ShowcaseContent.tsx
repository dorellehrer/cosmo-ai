'use client';

import { useState, useMemo } from 'react';

type ShowcaseItem = {
  name: string;
  handle: string;
  category: string;
  likes: number;
  description: string;
};

type Category = {
  id: string;
  label: string;
  icon: string;
};

const categoryIcons: Record<string, string> = {
  automation: '⚡',
  productivity: '📋',
  'smart-home': '🏠',
  developer: '💻',
  creative: '🎨',
  personal: '👤',
};

const categoryLabels: Record<string, string> = {
  automation: 'Automation',
  productivity: 'Productivity',
  'smart-home': 'Smart Home',
  developer: 'Developer',
  creative: 'Creative',
  personal: 'Personal',
};

export function ShowcaseContent({
  items,
  categories,
}: {
  items: ShowcaseItem[];
  categories: Category[];
}) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items;
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  return (
    <>
      {/* Category pills — interactive filter */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12 sm:mb-16">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              cat.id === activeCategory
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25'
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
            {cat.id !== 'all' && (
              <span className="ml-1 text-xs opacity-60">
                {items.filter((i) => i.category === cat.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Showcase Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {filteredItems.map((item) => (
          <article
            key={item.handle}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6 hover:bg-white/10 hover:border-white/20 transition-all group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-sm font-bold text-white">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <div className="text-white font-medium text-sm">{item.name}</div>
                  <div className="text-white/40 text-xs">{item.handle}</div>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/50">
                {categoryIcons[item.category]} {categoryLabels[item.category]}
              </span>
            </div>

            {/* Content */}
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              {item.description}
            </p>

            {/* Footer */}
            <div className="flex items-center text-white/30 text-xs">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {item.likes}
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-white/60">No showcases in this category yet.</p>
          <button
            onClick={() => setActiveCategory('all')}
            className="mt-4 text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors"
          >
            View all showcases →
          </button>
        </div>
      )}
    </>
  );
}
