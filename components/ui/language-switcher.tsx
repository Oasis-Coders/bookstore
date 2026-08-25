'use client';

import { useT } from '@/lib/i18n/use-t';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, toggle } = useT();

  return (
    <button
      onClick={toggle}
      className={`inline-flex h-8 items-center justify-center rounded-[12px] border border-[#0f3d2e]/15 bg-white px-3 text-[12px] font-semibold tracking-wide text-[#0f3d2e] shadow-[0_2px_8px_rgba(15,61,46,0.06)] transition hover:bg-[#faf6ee] hover:border-[#0f3d2e]/25 ${className}`}
      aria-label="Toggle language"
      type="button"
    >
      <span className={lang === 'en' ? 'text-[#0f3d2e]' : 'text-[#4f7a5c]/60'}>EN</span>
      <span className="mx-1 text-[#4f7a5c]/30">/</span>
      <span className={lang === 'zh' ? 'text-[#0f3d2e]' : 'text-[#4f7a5c]/60'}>中</span>
    </button>
  );
}

export function LanguageSwitcherDark({ className = '' }: { className?: string }) {
  const { lang, toggle } = useT();
  return (
    <button
      onClick={toggle}
      className={`inline-flex h-8 items-center rounded-[10px] bg-white/10 px-3 text-[11px] font-semibold text-white/80 backdrop-blur hover:bg-white/15 ${className}`}
      aria-label="Toggle language"
      type="button"
    >
      <span className={lang === 'en' ? 'text-white' : 'text-white/50'}>EN</span>
      <span className="mx-1 text-white/30">/</span>
      <span className={lang === 'zh' ? 'text-white' : 'text-white/50'}>中</span>
    </button>
  );
}
