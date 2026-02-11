import Link from 'next/link';
import type { Metadata } from 'next';
import { PublicNav } from '@/components/PublicNav';
import { PublicFooter } from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Security — Nova AI',
  description:
    'How Nova protects your data. AES-256 encryption, OAuth2, GDPR compliance, and a privacy-first architecture.',
  openGraph: {
    title: 'Security — Nova AI',
    description:
      'How Nova protects your data. AES-256 encryption, OAuth2, GDPR compliance, and a privacy-first architecture.',
  },
};

const securityPrinciples = [
  {
    icon: '🔒',
    title: 'Encrypted at rest & in transit',
    description:
      'All integration tokens are encrypted with AES-256-GCM. Data in transit uses TLS 1.3. Your credentials never touch disk in plaintext.',
  },
  {
    icon: '🛡️',
    title: 'OAuth2 everywhere',
    description:
      'We use industry-standard OAuth2 for all third-party integrations. Nova never sees or stores your passwords.',
  },
  {
    icon: '🚫',
    title: 'No data selling — ever',
    description:
      'We do not sell, share, or monetize your data. Our business model is subscription-based, not advertising.',
  },
  {
    icon: '🧠',
    title: 'No training on your data',
    description:
      'Your conversations, files, and integration data are never used to train AI models. Your data is yours.',
  },
  {
    icon: '🔐',
    title: 'Strict security headers',
    description:
      'HSTS with preload, X-Frame-Options DENY, X-Content-Type-Options nosniff, and restrictive Permissions-Policy on every response.',
  },
  {
    icon: '🗄️',
    title: 'Parameterized queries only',
    description:
      'All database access goes through Prisma ORM with parameterized queries. SQL injection is structurally impossible.',
  },
];

const threatModel = [
  {
    threat: 'Credential theft',
    mitigation: 'AES-256-GCM encryption, AWS Secrets Manager for production keys, no plaintext storage',
  },
  {
    threat: 'Session hijacking',
    mitigation: 'JWT tokens with short expiry, HTTPS-only cookies, CSRF protection',
  },
  {
    threat: 'API abuse',
    mitigation: 'Per-user rate limiting with configurable presets (auth, chat, API, agent provisioning)',
  },
  {
    threat: 'Injection attacks',
    mitigation: 'Prisma parameterized queries, input validation, Content Security Policy',
  },
  {
    threat: 'Unauthorized access',
    mitigation: 'Every API route verifies session + user ownership. No ambient authority.',
  },
  {
    threat: 'Data leakage',
    mitigation: 'Strict CORS, security headers, no data in error responses, server-side only DB access',
  },
  {
    threat: 'Supply chain attacks',
    mitigation: 'Minimal dependencies, lockfile integrity, automated vulnerability scanning',
  },
  {
    threat: 'Desktop app exploitation',
    mitigation: 'Sandboxed IPC, action-specific channels (no catch-all), user confirmation for destructive ops',
  },
];

const complianceItems = [
  {
    icon: '🇪🇺',
    title: 'GDPR compliant',
    description: 'Full data export, right to deletion, data minimization, and lawful processing basis.',
  },
  {
    icon: '🍪',
    title: 'Cookie transparency',
    description: 'Minimal cookies (session + locale only), no third-party tracking, clear cookie policy.',
  },
  {
    icon: '📤',
    title: 'Data portability',
    description: 'Export all your data anytime from Settings. Standard formats, no lock-in.',
  },
  {
    icon: '🗑️',
    title: 'Right to deletion',
    description: 'Delete your account and all associated data with one click. No retention period.',
  },
];

const faq = [
  {
    q: 'Where is my data stored?',
    a: 'Your data is stored in PostgreSQL on AWS RDS with encryption at rest. Integration tokens are additionally encrypted with AES-256-GCM. We use AWS eu-west-1 (Ireland) as our primary region.',
  },
  {
    q: 'Can Nova read my emails and files?',
    a: 'Only when you explicitly connect an integration and ask Nova to perform an action. Nova uses read-only access by default and requests write permissions only when needed (e.g., creating a calendar event).',
  },
  {
    q: 'Is my conversation data used for training?',
    a: 'No. Your conversations are processed by the AI model to generate responses but are never stored or used for model training. We use commercial API agreements with OpenAI and Anthropic that explicitly exclude customer data from training.',
  },
  {
    q: 'What happens when I delete my account?',
    a: 'All your data is permanently deleted: conversations, user profile, integration tokens, usage records, and any agent instances. This is irreversible and immediate.',
  },
  {
    q: 'How does the desktop app access my computer?',
    a: 'The desktop app uses Electron with specific IPC channels for each capability (file access, screenshots, etc.). There is no catch-all "run anything" channel. Destructive actions require explicit user confirmation.',
  },
  {
    q: 'Do you have SOC 2 compliance?',
    a: 'We are working toward SOC 2 Type II certification. Our infrastructure is built on AWS, which is SOC 2 certified. We follow security best practices including encryption, access controls, and audit logging.',
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <PublicNav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl sm:text-4xl">🛡️</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Security you can trust
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto">
            Nova needs access to your most sensitive data to be useful. Here&apos;s exactly how we protect it.
          </p>
        </div>

        {/* Core Principles */}
        <section className="mb-16 sm:mb-24">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">✓</span>
            Security by default
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {securityPrinciples.map((principle) => (
              <div
                key={principle.title}
                className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6 hover:bg-white/10 transition-all"
              >
                <div className="text-3xl mb-3">{principle.icon}</div>
                <h3 className="text-white font-semibold mb-2">{principle.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{principle.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Threat Model */}
        <section className="mb-16 sm:mb-24">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-sm">🎯</span>
            Threat model
          </h2>
          <p className="text-white/50 mb-8">
            We proactively model threats against Nova&apos;s architecture and implement mitigations before they can be exploited.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden">
            <div className="hidden sm:grid sm:grid-cols-2 bg-white/5 px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">
              <span>Threat</span>
              <span>Mitigation</span>
            </div>
            <div className="divide-y divide-white/10">
              {threatModel.map((item) => (
                <div key={item.threat} className="p-5 sm:grid sm:grid-cols-2 sm:gap-6">
                  <div className="text-white font-medium text-sm mb-1 sm:mb-0">{item.threat}</div>
                  <div className="text-white/50 text-sm leading-relaxed">{item.mitigation}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Infrastructure */}
        <section className="mb-16 sm:mb-24">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sm">☁️</span>
            Infrastructure
          </h2>
          <p className="text-white/50 mb-8">
            Nova runs on AWS with production-grade security at every layer.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: 'AWS ECS Fargate', desc: 'Serverless containers — no SSH access, no persistent VMs', icon: '📦' },
              { title: 'AWS RDS PostgreSQL', desc: 'Managed database with encryption at rest and automated backups', icon: '🗄️' },
              { title: 'AWS Secrets Manager', desc: 'All production secrets managed centrally — never in code or env vars', icon: '🔑' },
              { title: 'AWS ALB + WAF', desc: 'Application load balancer with web application firewall', icon: '🌐' },
              { title: 'CloudWatch', desc: 'Centralized logging and monitoring with alerts', icon: '📊' },
              { title: 'Multi-AZ', desc: 'Redundant deployment across availability zones', icon: '🌍' },
            ].map((item) => (
              <div key={item.title} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="text-xl mb-2">{item.icon}</div>
                <h3 className="text-white font-medium text-sm mb-1">{item.title}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Compliance */}
        <section className="mb-16 sm:mb-24">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm">📋</span>
            Compliance & data rights
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {complianceItems.map((item) => (
              <div key={item.title} className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Desktop App Security */}
        <section className="mb-16 sm:mb-24">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-fuchsia-500/20 flex items-center justify-center text-sm">💻</span>
            Desktop app security
          </h2>
          <p className="text-white/50 mb-8">
            The Nova desktop app has deep system access. Here&apos;s how we keep it safe.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-5 sm:p-6 space-y-4">
            {[
              { label: 'Scoped IPC channels', desc: 'Each capability (file read, screenshot, volume) has its own dedicated channel. No generic "execute anything" interface.' },
              { label: 'User confirmation', desc: 'Destructive actions (deleting files, emptying trash, sending emails) require explicit user confirmation before execution.' },
              { label: 'No remote code execution', desc: 'The desktop app does not download or execute arbitrary code. All automation logic is bundled and signed at build time.' },
              { label: 'macOS Accessibility opt-in', desc: 'UI automation features require the user to explicitly grant Accessibility permissions in System Preferences.' },
              { label: 'Code-signed distribution', desc: 'Desktop builds are code-signed and notarized through Apple\'s developer program.' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <span className="text-white font-medium text-sm">{item.label}</span>
                  <p className="text-white/40 text-sm mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16 sm:mb-24">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm">❓</span>
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faq.map((item) => (
              <details key={item.q} className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <summary className="px-5 py-4 cursor-pointer text-white font-medium text-sm sm:text-base flex items-center justify-between hover:bg-white/5 transition-colors">
                  {item.q}
                  <svg className="w-5 h-5 text-white/30 group-open:rotate-180 transition-transform shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-white/50 text-sm leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Contact */}
        <div className="text-center bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border border-white/10 rounded-2xl p-8 sm:p-12">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            Found a vulnerability?
          </h2>
          <p className="text-white/60 mb-6 max-w-lg mx-auto">
            We take security reports seriously. If you&apos;ve found a security issue, please contact us through our responsible disclosure process.
          </p>
          <Link
            href="/contact"
            className="inline-block px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 rounded-full text-white font-semibold transition-all"
          >
            Report a vulnerability
          </Link>
        </div>
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
