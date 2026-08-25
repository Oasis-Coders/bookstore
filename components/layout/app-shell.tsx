'use client';

import { useEffect, useState } from 'react';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { navItems } from '@/lib/app-config';
import { useT } from '@/lib/i18n/use-t';
import { LanguageSwitcher, LanguageSwitcherDark } from '@/components/ui/language-switcher';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type AppShellProps = {
  title: string;
  titleZh: string;
  eyebrow?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export function AppShell({ title, titleZh, eyebrow, children, actions }: AppShellProps) {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [avatarIcon, setAvatarIcon] = useState('活');
  const [avatarColor, setAvatarColor] = useState('#d26a39');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as any;
      if (meta?.avatar_icon) setAvatarIcon(meta.avatar_icon);
      if (meta?.avatar_color) setAvatarColor(meta.avatar_color);
      if (meta?.display_name) setDisplayName(meta.display_name);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#faf6ee] text-[#0f3d2e]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 lg:flex-row lg:px-8">
        <MobileSidebar>
          {/* Brand */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[14px] font-bold text-white shadow-sm" style={{ backgroundColor: avatarColor }}>
                {avatarIcon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d9edf6]">COCM</p>
                  {displayName && <span className="text-[11px] text-white/60">• {displayName}</span>}
                </div>
                <h1 className="mt-1.5 font-serif text-[20px] leading-tight tracking-tight text-white">
                  {isZh ? '活水书房' : 'COCM Bookshop'}
                  <br />
                  <span className="text-[12px] font-sans font-normal tracking-wide opacity-70">{isZh ? '书店管理系统' : 'Bookshop System'}</span>
                </h1>
              </div>
            </div>
            <LanguageSwitcherDark />
          </div>

          <div className="mt-6 flex min-h-0 flex-1 flex-col">
            <SidebarNav items={navItems} />
          </div>
        </MobileSidebar>

        <main className="flex-1 pt-14 lg:pt-0">
          <header className="flex flex-wrap items-start justify-between gap-4 rounded-[24px] border border-[#0f3d2e]/10 bg-white p-6 shadow-[rgba(15,61,46,0.03)_0px_0px_0px_1px,rgba(15,61,46,0.05)_0px_2px_8px,rgba(15,61,46,0.10)_0px_8px_24px] lg:p-7">
            <div>
              {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#4f7a5c]">{eyebrow}</p>}
              <h2 className="mt-2 font-serif text-[30px] tracking-tight text-[#0f3d2e] lg:text-[36px]">{isZh ? titleZh : title}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LanguageSwitcher />
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
          </header>

          <section className="mt-6">{children}</section>
        </main>
      </div>
    </div>
  );
}
