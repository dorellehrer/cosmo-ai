import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy - Nova AI',
  description: 'Cookie Policy for Nova AI. Learn about how we use cookies and similar technologies on our platform.',
};

const cookieTypes = [
  {
    name: 'Essential Cookies',
    icon: '🔑',
    required: true,
    description: 'Required for the website to function properly. Cannot be disabled.',
    examples: [
      { name: 'session_id', purpose: 'Maintains your login session', duration: 'Session' },
      { name: 'csrf_token', purpose: 'Security token to prevent attacks', duration: 'Session' },
      { name: 'cookie_consent', purpose: 'Remembers your cookie preferences', duration: '1 year' },
    ],
  },
  {
    name: 'Functional Cookies',
    icon: '⚙️',
    required: false,
    description: 'Enable enhanced functionality and personalization.',
    examples: [
      { name: 'language', purpose: 'Remembers your language preference', duration: '1 year' },
      { name: 'theme', purpose: 'Stores your display preferences', duration: '1 year' },
      { name: 'last_chat', purpose: 'Remembers your last conversation', duration: '30 days' },
    ],
  },
  {
    name: 'Analytics Cookies',
    icon: '📊',
    required: false,
    description: 'Help us understand how visitors interact with our website.',
    examples: [
      { name: '_ga', purpose: 'Google Analytics - distinguishes users', duration: '2 years' },
      { name: '_gid', purpose: 'Google Analytics - distinguishes users', duration: '24 hours' },
      { name: 'amplitude_id', purpose: 'Product analytics and usage tracking', duration: '1 year' },
    ],
  },
  {
    name: 'Marketing Cookies',
    icon: '📢',
    required: false,
    description: 'Used to deliver relevant advertisements and track campaign performance.',
    examples: [
      { name: '_fbp', purpose: 'Facebook advertising pixel', duration: '3 months' },
      { name: '_gcl_au', purpose: 'Google Ads conversion tracking', duration: '3 months' },
      { name: 'twitter_pixel', purpose: 'Twitter advertising tracking', duration: '2 years' },
    ],
  },
];

export default function CookiesPage() {
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 mb-6">
            <span className="text-3xl">🍪</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Cookie Policy
          </h1>
          <p className="text-white/60">
            Last updated: February 1, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4">What Are Cookies?</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They help websites remember information about your visit, like your preferred language and other settings, which can make your next visit easier and the site more useful to you.
            </p>
            <p className="text-white/70 leading-relaxed">
              We also use similar technologies like pixels, web beacons, and local storage for similar purposes. When we say &quot;cookies&quot; in this policy, we mean all of these technologies.
            </p>
          </div>

          {/* How We Use Cookies */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4">How We Use Cookies</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Nova AI uses cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
              <li>Keep you signed in and maintain your session</li>
              <li>Remember your preferences and settings</li>
              <li>Understand how you use our service</li>
              <li>Improve and personalize your experience</li>
              <li>Measure the effectiveness of our marketing</li>
              <li>Provide security and detect abuse</li>
            </ul>
          </div>

          {/* Cookie Types */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-2">Types of Cookies We Use</h2>
            
            {cookieTypes.map((type) => (
              <div key={type.name} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-2xl shrink-0">
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{type.name}</h3>
                        {type.required ? (
                          <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs font-medium rounded-full">
                            Required
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-white/10 text-white/60 text-xs font-medium rounded-full">
                            Optional
                          </span>
                        )}
                      </div>
                      <p className="text-white/60 text-sm">{type.description}</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="text-left text-white/60 text-xs font-medium px-6 py-3 uppercase tracking-wider">Cookie</th>
                        <th className="text-left text-white/60 text-xs font-medium px-6 py-3 uppercase tracking-wider">Purpose</th>
                        <th className="text-left text-white/60 text-xs font-medium px-6 py-3 uppercase tracking-wider">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {type.examples.map((cookie) => (
                        <tr key={cookie.name}>
                          <td className="px-6 py-3 text-white/80 text-sm font-mono">{cookie.name}</td>
                          <td className="px-6 py-3 text-white/60 text-sm">{cookie.purpose}</td>
                          <td className="px-6 py-3 text-white/60 text-sm">{cookie.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Managing Cookies */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4">Managing Your Cookie Preferences</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              You have several options for managing cookies:
            </p>
            
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-medium mb-2">🔧 Cookie Settings on Nova</h4>
                <p className="text-white/60 text-sm">
                  When you first visit our site, you can choose which optional cookies to accept. You can change these preferences anytime by clicking the &quot;Cookie Settings&quot; link in the footer.
                </p>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-medium mb-2">🌐 Browser Settings</h4>
                <p className="text-white/60 text-sm mb-3">
                  Most browsers allow you to control cookies through their settings. Here&apos;s how to manage cookies in popular browsers:
                </p>
                <ul className="text-white/60 text-sm space-y-1 ml-4">
                  <li>• <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">Chrome</a></li>
                  <li>• <a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">Firefox</a></li>
                  <li>• <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">Safari</a></li>
                  <li>• <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">Edge</a></li>
                </ul>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-medium mb-2">🚫 Opt-Out Links</h4>
                <p className="text-white/60 text-sm mb-3">
                  You can also opt out of specific third-party cookies:
                </p>
                <ul className="text-white/60 text-sm space-y-1 ml-4">
                  <li>• <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">Google Analytics Opt-out</a></li>
                  <li>• <a href="https://www.facebook.com/help/568137493302217" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">Facebook Ad Preferences</a></li>
                  <li>• <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">Digital Advertising Alliance Opt-out</a></li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p className="text-yellow-200/90 text-sm">
                <strong>Note:</strong> Blocking some cookies may impact your experience on Nova. Essential cookies cannot be disabled as they are necessary for the website to function.
              </p>
            </div>
          </div>

          {/* Third-Party Cookies */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4">Third-Party Cookies</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Some cookies are placed by third-party services that appear on our pages. We do not control these cookies. The third parties that set these cookies include:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
              <li><strong className="text-white/90">Google Analytics</strong> — For website analytics</li>
              <li><strong className="text-white/90">Stripe</strong> — For secure payment processing</li>
              <li><strong className="text-white/90">Intercom</strong> — For customer support chat</li>
              <li><strong className="text-white/90">Amplitude</strong> — For product analytics</li>
            </ul>
            <p className="text-white/70 leading-relaxed mt-4">
              Please refer to these third parties&apos; privacy policies for more information about their cookies and data practices.
            </p>
          </div>

          {/* Updates */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4">Changes to This Policy</h2>
            <p className="text-white/70 leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </div>

          {/* Contact */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-4">Contact Us</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              If you have any questions about our use of cookies, please contact us:
            </p>
            <ul className="text-white/70 space-y-2 ml-4">
              <li>Email: <a href="mailto:privacy@heynova.se" className="text-violet-400 hover:text-violet-300">privacy@heynova.se</a></li>
              <li>Or visit our <Link href="/contact" className="text-violet-400 hover:text-violet-300">Contact page</Link></li>
            </ul>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/privacy"
            className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/70 hover:text-white text-sm transition-all"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/70 hover:text-white text-sm transition-all"
          >
            Terms of Service
          </Link>
          <Link
            href="/contact"
            className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/70 hover:text-white text-sm transition-all"
          >
            Contact Us
          </Link>
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
