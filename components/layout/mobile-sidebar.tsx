'use client';

import { useState } from 'react';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { navItems as defaultNav } from '@/lib/app-config';
import { LanguageSwitcherDark } from '@/components/ui/language-switcher';

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
      <div className="mt-4 border-t border-white/10 pt-4">
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
