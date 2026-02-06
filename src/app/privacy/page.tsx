import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Cosmo AI',
  description: 'Privacy Policy for Cosmo AI. Learn how we collect, use, and protect your personal data. GDPR and CCPA compliant.',
};

export default function PrivacyPage() {
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 mb-6">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-white/60">
            Last updated: February 1, 2026
          </p>
        </div>

        {/* GDPR/CCPA Badge */}
        <div className="flex justify-center gap-4 mb-8">
          <div className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-sm font-medium">
            ✓ GDPR Compliant
          </div>
          <div className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-sm font-medium">
            ✓ CCPA Compliant
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 md:p-10">
          <div className="prose prose-invert max-w-none">
            {/* Overview Box */}
            <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-6 mb-10">
              <h3 className="text-lg font-semibold text-white mb-3">🔑 Privacy at a Glance</h3>
              <ul className="text-white/70 space-y-2 text-sm">
                <li>✓ We never sell your personal data</li>
                <li>✓ Your conversation data is not used for AI training without consent</li>
                <li>✓ You can export or delete your data at any time</li>
                <li>✓ We use encryption for data in transit and at rest</li>
                <li>✓ Third-party integrations require your explicit consent</li>
              </ul>
            </div>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Cosmo AI Inc. (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI assistant service.
              </p>
              <p className="text-white/70 leading-relaxed">
                We comply with the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and other applicable privacy laws.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-white mb-3 mt-6">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li><strong className="text-white/90">Account Information:</strong> Name, email address, password, profile preferences</li>
                <li><strong className="text-white/90">Conversation Data:</strong> Messages and queries you send to Cosmo</li>
                <li><strong className="text-white/90">Payment Information:</strong> Billing details processed securely via Stripe</li>
                <li><strong className="text-white/90">Integration Data:</strong> Information from connected services (with your permission)</li>
              </ul>

              <h3 className="text-lg font-medium text-white mb-3 mt-6">2.2 Information Collected Automatically</h3>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li><strong className="text-white/90">Usage Data:</strong> How you interact with our Service</li>
                <li><strong className="text-white/90">Device Information:</strong> Browser type, operating system, device identifiers</li>
                <li><strong className="text-white/90">Log Data:</strong> IP address, access times, pages viewed</li>
                <li><strong className="text-white/90">Cookies:</strong> See our <Link href="/cookies" className="text-violet-400 hover:text-violet-300">Cookie Policy</Link></li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                We use your information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Providing and improving the Cosmo AI service</li>
                <li>Processing your requests and responding to your queries</li>
                <li>Executing actions through connected integrations (on your instruction)</li>
                <li>Processing payments and managing subscriptions</li>
                <li>Sending service-related communications</li>
                <li>Analyzing usage patterns to improve our Service</li>
                <li>Detecting and preventing fraud or abuse</li>
                <li>Complying with legal obligations</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">4. Legal Basis for Processing (GDPR)</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Under GDPR, we process your data based on:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li><strong className="text-white/90">Contract Performance:</strong> To provide the services you&apos;ve requested</li>
                <li><strong className="text-white/90">Legitimate Interests:</strong> To improve our service and ensure security</li>
                <li><strong className="text-white/90">Consent:</strong> For optional features like marketing communications</li>
                <li><strong className="text-white/90">Legal Obligation:</strong> To comply with applicable laws</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">5. Data Sharing and Disclosure</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                We do <strong className="text-white">NOT</strong> sell your personal data. We may share information with:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li><strong className="text-white/90">Service Providers:</strong> Companies that help us operate (hosting, payment processing, analytics)</li>
                <li><strong className="text-white/90">Integration Partners:</strong> Third-party services you connect (Google, Spotify, etc.)</li>
                <li><strong className="text-white/90">Legal Requirements:</strong> When required by law or to protect rights</li>
                <li><strong className="text-white/90">Business Transfers:</strong> In connection with mergers or acquisitions</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">6. AI and Your Data</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Important information about how AI processes your data:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Your conversations are processed to provide AI responses</li>
                <li>We do <strong className="text-white">NOT</strong> use your personal conversations to train AI models without explicit consent</li>
                <li>Aggregated, anonymized data may be used to improve service quality</li>
                <li>You can delete your conversation history at any time</li>
                <li>AI responses are generated in real-time and not stored longer than necessary</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">7. Data Retention</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                We retain your data as follows:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li><strong className="text-white/90">Account Data:</strong> Until you delete your account</li>
                <li><strong className="text-white/90">Conversation History:</strong> Until you delete it or your account</li>
                <li><strong className="text-white/90">Payment Records:</strong> As required by law (typically 7 years)</li>
                <li><strong className="text-white/90">Log Data:</strong> Up to 90 days</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">8. Your Rights</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Depending on your location, you have the following rights:
              </p>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 mt-4">
                <h4 className="text-white font-medium mb-3">🇪🇺 GDPR Rights (EU/EEA Residents)</h4>
                <ul className="list-disc list-inside text-white/70 space-y-2 ml-4 text-sm">
                  <li><strong className="text-white/90">Access:</strong> Request a copy of your personal data</li>
                  <li><strong className="text-white/90">Rectification:</strong> Correct inaccurate data</li>
                  <li><strong className="text-white/90">Erasure:</strong> Delete your personal data (&quot;right to be forgotten&quot;)</li>
                  <li><strong className="text-white/90">Portability:</strong> Export your data in a machine-readable format</li>
                  <li><strong className="text-white/90">Restriction:</strong> Limit how we process your data</li>
                  <li><strong className="text-white/90">Objection:</strong> Object to processing based on legitimate interests</li>
                  <li><strong className="text-white/90">Withdraw Consent:</strong> Revoke consent at any time</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5 mt-4">
                <h4 className="text-white font-medium mb-3">🇺🇸 CCPA Rights (California Residents)</h4>
                <ul className="list-disc list-inside text-white/70 space-y-2 ml-4 text-sm">
                  <li><strong className="text-white/90">Know:</strong> What personal information we collect and how it&apos;s used</li>
                  <li><strong className="text-white/90">Delete:</strong> Request deletion of your personal information</li>
                  <li><strong className="text-white/90">Opt-Out:</strong> We don&apos;t sell data, but you can opt out of any data sharing</li>
                  <li><strong className="text-white/90">Non-Discrimination:</strong> Equal service regardless of privacy choices</li>
                </ul>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">9. Data Security</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                We implement industry-standard security measures:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>TLS 1.3 encryption for all data in transit</li>
                <li>AES-256 encryption for data at rest</li>
                <li>Regular security audits and penetration testing</li>
                <li>Access controls and authentication mechanisms</li>
                <li>SOC 2 Type II compliance (in progress)</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">10. International Transfers</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Your data may be transferred to and processed in the United States. For EU/EEA residents, we ensure adequate protection through:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Standard Contractual Clauses (SCCs) approved by the EU Commission</li>
                <li>Data Processing Agreements with all service providers</li>
                <li>Assessment of recipient country data protection laws</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">11. Children&apos;s Privacy</h2>
              <p className="text-white/70 leading-relaxed">
                Cosmo AI is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">12. Changes to This Policy</h2>
              <p className="text-white/70 leading-relaxed">
                We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notification at least 30 days before changes take effect. Your continued use of the Service after changes become effective constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">13. Contact Us</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                For privacy-related inquiries or to exercise your rights:
              </p>
              <ul className="text-white/70 space-y-2 ml-4">
                <li>Email: <a href="mailto:privacy@cosmo.ai" className="text-violet-400 hover:text-violet-300">privacy@cosmo.ai</a></li>
                <li>Data Protection Officer: <a href="mailto:dpo@cosmo.ai" className="text-violet-400 hover:text-violet-300">dpo@cosmo.ai</a></li>
                <li>Address: Cosmo AI Inc., 548 Market St, Suite 35435, San Francisco, CA 94104</li>
              </ul>
              <p className="text-white/70 leading-relaxed mt-4">
                EU Representative: Cosmo AI Europe Ltd., Dublin, Ireland
              </p>
            </section>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/terms"
            className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/70 hover:text-white text-sm transition-all"
          >
            Terms of Service
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
            <span className="text-white/60">© 2026 Cosmo AI. All rights reserved.</span>
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
