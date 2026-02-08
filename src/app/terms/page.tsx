import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Nova AI',
  description: 'Terms of Service for Nova AI. Read our terms and conditions for using our AI assistant platform.',
};

export default function TermsPage() {
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
            <span className="text-3xl">📜</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-white/60">
            Last updated: February 8, 2026
          </p>
        </div>

        {/* Content */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 md:p-10">
          <div className="prose prose-invert max-w-none">
            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                By accessing or using Nova AI (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you may not access the Service.
              </p>
              <p className="text-white/70 leading-relaxed">
                These Terms apply to all visitors, users, and others who access or use the Service. By using Nova AI, you represent that you are at least 18 years of age, or if you are under 18, that you have obtained parental or guardian consent to use the Service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Nova AI is an artificial intelligence assistant platform that provides:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Conversational AI assistance for various tasks</li>
                <li>Integration with third-party services (calendar, email, smart home devices)</li>
                <li>Automation capabilities for routine tasks</li>
                <li>Voice and text-based interaction</li>
                <li>Personalized recommendations and assistance</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">3. User Accounts</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms.
              </p>
              <p className="text-white/70 leading-relaxed mb-4">
                You are responsible for:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Safeguarding the password used to access the Service</li>
                <li>Any activities or actions under your account</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">4. Subscription and Payments</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Nova uses a credit-based billing system. The Standard (free) model is always available. Premium models consume credits per message. By purchasing credits:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>You agree to pay all applicable fees as described at the time of purchase</li>
                <li>Credits can be purchased through our pricing page</li>
                <li>Credits do not expire</li>
                <li>Premium models consume credits on a per-message basis</li>
                <li>Refunds are provided in accordance with our refund policy</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">5. Acceptable Use</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                You agree not to use Nova AI to:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Generate, distribute, or store illegal, harmful, or offensive content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use automated means to access the Service without permission</li>
                <li>Reverse engineer, decompile, or attempt to extract source code</li>
                <li>Use the Service for competitive analysis or to build competing products</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">6. Intellectual Property</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                The Service and its original content, features, and functionality are owned by Nova AI and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <p className="text-white/70 leading-relaxed">
                You retain ownership of any content you submit, post, or display through the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, process, and display such content solely for the purpose of providing the Service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">7. Third-Party Integrations</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Nova AI may integrate with third-party services (Google, Spotify, Philips Hue, etc.). Your use of these integrations is subject to the respective third-party terms of service. We are not responsible for the practices of third-party services.
              </p>
              <p className="text-white/70 leading-relaxed">
                You authorize us to access and interact with your third-party accounts as necessary to provide the Service functionality you have requested.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">8. AI-Generated Content Disclaimer</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Nova AI uses artificial intelligence to generate responses and perform actions. While we strive for accuracy:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>AI responses may contain errors or inaccuracies</li>
                <li>AI should not be used as a sole source for critical decisions</li>
                <li>We do not guarantee the accuracy, completeness, or reliability of AI outputs</li>
                <li>You are responsible for verifying important information</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">9. Limitation of Liability</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                To the maximum extent permitted by law, Nova AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses.
              </p>
              <p className="text-white/70 leading-relaxed">
                Our total liability shall not exceed the amount you have paid to us in the twelve (12) months preceding the claim.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">10. Warranty Disclaimer</h2>
              <p className="text-white/70 leading-relaxed">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">11. Termination</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Your right to use the Service will cease immediately</li>
                <li>We may delete your account and data</li>
                <li>Provisions that should survive termination will remain in effect</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">12. Changes to Terms</h2>
              <p className="text-white/70 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of material changes via email or in-app notification at least 30 days before changes take effect. Your continued use of the Service after changes become effective constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">13. Governing Law</h2>
              <p className="text-white/70 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of Sweden, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Stockholm, Sweden.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">14. Contact Us</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <ul className="text-white/70 space-y-2 ml-4">
                <li>Email: <a href="mailto:legal@heynova.se" className="text-violet-400 hover:text-violet-300">legal@heynova.se</a></li>
              </ul>
            </section>
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
            href="/cookies"
            className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/70 hover:text-white text-sm transition-all"
          >
            Cookie Policy
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
