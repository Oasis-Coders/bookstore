'use client';

import { useState } from 'react';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { navItems as defaultNav } from '@/lib/app-config';
import { LanguageSwitcherDark } from '@/components/ui/language-switcher';
import { signOut } from '@/app/auth/actions';

type Props = {
  items?: typeof defaultNav;
  avatarIcon?: string;
  avatarColor?: string;
  displayName?: string;
  userRole?: string | null;
  children?: React.ReactNode;
};

export function MobileSidebar({ items = defaultNav, avatarIcon = '活', avatarColor = '#d26a39', displayName = '', userRole, children }: Props) {
  const [open, setOpen] = useState(false);

  const sidebarContent = children || (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/15 text-[14px] font-bold" style={{ backgroundColor: avatarColor }}>
          {avatarIcon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-white">{displayName || '活水书房'}</p>
          <p className="text-[11px] text-white/60">COCM Bookshop</p>
        </div>
      </div>
      <div className="mt-6 flex-1 overflow-y-auto">
        <SidebarNav items={items} />
      </div>
      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
        <form action={signOut}>
          <button type="submit" className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[12px] text-white/70 hover:bg-white/10 hover:text-white transition">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3M11 11l3-3-3-3M13 8H6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            退出登录
          </button>
        </form>
        <LanguageSwitcherDark />
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#0f3d2e] text-white shadow-lg lg:hidden"
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
        </svg>
      </button>

      <div className={`fixed inset-0 z-40 flex transition lg:hidden ${open ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-[#0f3d2e]/40 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <div className={`relative flex w-[280px] flex-col bg-[#0f3d2e] p-5 transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
