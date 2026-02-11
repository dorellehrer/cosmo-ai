'use client';

import Link from 'next/link';

const footerLinks = [
  { href: '/blog', label: 'Blog' },
  { href: '/showcase', label: 'Showcase' },
  { href: '/all-integrations', label: 'Integrations' },
  { href: '/security', label: 'Security' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/contact', label: 'Contact' },
  { href: '/help', label: 'Help' },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 mt-12 sm:mt-20" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-xs sm:text-sm">✨</span>
          </div>
          <span className="text-sm sm:text-base text-white/70">
            © 2026 Nova AI. All rights reserved.
          </span>
        </div>
        <nav aria-label="Footer navigation">
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-white/50 text-sm">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-white/80 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </footer>
  );
}
