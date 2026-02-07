import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="text-center max-w-md">
        <div 
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-6 sm:mb-8"
          aria-hidden="true"
        >
          <span className="text-4xl sm:text-5xl">🤔</span>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">
          {t('title')}
        </h1>
        
        <p className="text-sm sm:text-base text-white/60 mb-6 sm:mb-8 px-4">
          {t('description')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
          <Link
            href="/"
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-medium transition-all text-center"
          >
            {t('goHome')}
          </Link>
          <Link
            href="/chat"
            className="px-6 py-3 border border-white/20 hover:bg-white/10 rounded-full text-white font-medium transition-all text-center"
          >
            {t('chatWithNova')}
          </Link>
        </div>
      </div>
    </div>
  );
}
