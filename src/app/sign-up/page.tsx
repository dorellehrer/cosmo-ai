'use client';

import Link from 'next/link';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SocialAuthButtons, AuthDivider } from '@/components/SocialAuthButtons';

export default function SignUpPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const common = useTranslations('common');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create account
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      // Auto sign-in after successful signup
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Account created but sign-in failed, redirect to sign-in
        router.push('/sign-in');
      } else {
        router.push('/onboarding');
        router.refresh();
      }
    } catch {
      setError(t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 sm:gap-3"
            aria-label="Go to Nova AI homepage"
          >
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-xl sm:text-2xl">✨</span>
            </div>
            <span className="text-xl sm:text-2xl font-semibold text-white">{common('cosmo')}</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-6 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-white text-center mb-2">
            {t('createAccount')}
          </h1>
          <p className="text-sm sm:text-base text-white/60 text-center mb-6 sm:mb-8">
            {t('joinThousands')}
          </p>

          {/* Social Auth Buttons */}
          <SocialAuthButtons callbackUrl="/onboarding" />
          
          <AuthDivider text={t('orContinueWith') || 'or sign up with email'} />

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {error && (
              <div 
                className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-red-400 text-xs sm:text-sm"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-xs sm:text-sm font-medium text-white/80 mb-1.5 sm:mb-2"
              >
                {t('name')} <span className="text-white/40">{t('nameOptional')}</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                placeholder={t('namePlaceholder')}
                autoComplete="name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs sm:text-sm font-medium text-white/80 mb-1.5 sm:mb-2"
              >
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                placeholder={t('emailPlaceholder')}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs sm:text-sm font-medium text-white/80 mb-1.5 sm:mb-2"
              >
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                placeholder={t('passwordHint')}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm sm:text-base font-semibold transition-all"
            >
              {loading ? t('creatingAccount') : t('createAccount')}
            </button>
          </form>

          <p className="mt-5 sm:mt-6 text-center text-white/60 text-xs sm:text-sm">
            {t('alreadyHaveAccount')}{' '}
            <Link
              href="/sign-in"
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              {common('signIn')}
            </Link>
          </p>
        </div>

        <p className="mt-5 sm:mt-6 text-center text-white/40 text-[10px] sm:text-xs">
          {t('termsAgreement')}{' '}
          <Link href="/terms" className="underline hover:text-white/60">
            {t('termsOfService')}
          </Link>{' '}
          {t('and')}{' '}
          <Link href="/privacy" className="underline hover:text-white/60">
            {t('privacyPolicy')}
          </Link>
        </p>
      </div>
    </div>
  );
}
