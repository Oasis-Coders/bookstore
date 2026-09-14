'use client';

import { useT } from '@/lib/i18n/use-t';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, toggle } = useT();

  return (
    <button
      onClick={toggle}
      className={`inline-flex h-8 items-center justify-center rounded-[12px] border border-cocm-ink/15 bg-white px-3 text-[12px] font-semibold tracking-wide text-cocm-ink shadow-[0_2px_8px_rgba(45,47,146,0.06)] transition hover:bg-cocm-paper hover:border-cocm-ink/25 ${className}`}
      aria-label="Toggle language"
      type="button"
    >
      <span className={lang === 'en' ? 'text-cocm-ink' : 'text-[#5b5f94]/60'}>EN</span>
      <span className="mx-1 text-[#5b5f94]/30">/</span>
      <span className={lang === 'zh' ? 'text-cocm-ink' : 'text-[#5b5f94]/60'}>中</span>
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
