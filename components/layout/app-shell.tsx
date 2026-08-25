'use client';

import { useEffect, useState } from 'react';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { navItems } from '@/lib/app-config';
import { useT } from '@/lib/i18n/use-t';
import { LanguageSwitcher, LanguageSwitcherDark } from '@/components/ui/language-switcher';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { signOut } from '@/app/auth/actions';

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
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      const meta = data.user?.user_metadata as any;
      if (meta?.display_name) setDisplayName(meta.display_name);
      if (meta?.avatar_icon) {
        setAvatarIcon(meta.avatar_icon);
      } else if (meta?.display_name) {
        setAvatarIcon(meta.display_name.trim().charAt(0).toUpperCase() || '活');
      } else if (data.user?.email) {
        setAvatarIcon(data.user.email.charAt(0).toUpperCase());
      }
      if (meta?.avatar_color) setAvatarColor(meta.avatar_color);
      
      if (data.user) {
        try {
          const { data: roles, error } = await supabase.from('user_roles').select('roles(name)').eq('user_id', data.user.id);
          if (!error && roles && roles.length > 0) {
            const roleNames = (roles || []).map((r: any) => r.roles?.name).filter(Boolean);
            const isSuperAdmin = roleNames.includes('super_admin');
            const isAdmin = isSuperAdmin || roleNames.includes('admin');
            setUserRole(isSuperAdmin ? 'super_admin' : isAdmin ? 'admin' : roleNames[0] || 'staff');
            return;
          }
          const { data: direct } = await supabase.from('user_roles').select('role_id').eq('user_id', data.user.id).limit(1).single();
          if (direct?.role_id) {
            const { data: role } = await supabase.from('roles').select('name').eq('id', direct.role_id).single();
            if (role?.name) {
              setUserRole(role.name);
              return;
            }
          }
        } catch (e) {
          console.log('role fetch error', e);
        }
      }
    });
  }, []);

  const filteredNav = navItems.filter((item) => {
    if (!item.roles) return true;
    if (userRole === null) return true;
    return item.roles.includes(userRole as any) || userRole === 'super_admin';
  });

  const displayTitle = isZh ? titleZh : title;

  return (
    <div className="min-h-screen bg-[#faf6ee]">
      <MobileSidebar items={filteredNav} avatarIcon={avatarIcon} avatarColor={avatarColor} displayName={displayName} userRole={userRole} />
      <div className="mx-auto flex max-w-[1600px] gap-0 px-0 py-0 lg:gap-6 lg:px-6 lg:py-4">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[260px] shrink-0 flex-col rounded-[24px] bg-[#0f3d2e] text-white lg:flex shadow-[0_20px_60px_rgba(15,61,46,0.25)]">
          <div className="relative overflow-hidden rounded-t-[24px]">
            <div className="absolute inset-0">
              <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-[#d26a39]/20 blur-[20px]" />
              <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-[#1a5c46] blur-[16px]" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#d26a39]/10 via-transparent to-transparent" />
            <div className="relative px-5 py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/10 backdrop-blur text-[16px] font-bold ring-1 ring-white/20" style={{ backgroundColor: avatarColor }}>
                  {avatarIcon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold leading-tight tracking-tight">{displayName || (isZh ? '活水书房' : 'COCM Bookshop')}</p>
                  <span className="text-[11px] font-sans font-medium tracking-wide opacity-60">{isZh ? '书店管理系统' : 'Bookshop System'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2">
            <SidebarNav items={filteredNav} />
          </div>
          <div className="border-t border-white/[0.08] px-3 py-3 space-y-2 backdrop-blur-sm">
            <div className="px-3 py-2 rounded-[10px] bg-white/[0.06] border border-white/[0.08]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{isZh ? '当前身份' : 'Role'}</p>
              <p className="text-[12px] font-medium text-white/90 capitalize mt-0.5">{userRole || '...'}</p>
            </div>
            <form action={signOut}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-[12px] font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all group">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className="group-hover:translate-x-0.5 transition-transform"><path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3M11 11l3-3-3-3M13 8H6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {isZh ? '退出登录' : 'Logout'}
              </button>
            </form>
            <div className="flex justify-center pt-1">
              <LanguageSwitcherDark />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#faf6ee]/80 border-b border-[#0f3d2e]/5 lg:rounded-t-[20px] lg:border lg:mt-0 -mt-px">
            <div className="flex items-center justify-between px-4 py-4 lg:px-8 lg:py-6">
              <div className="min-w-0 flex-1">
                {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#d26a39] mb-1">{eyebrow}</p>}
                <h1 className="font-serif text-[24px] lg:text-[28px] tracking-tight text-[#0f3d2e] leading-none">{displayTitle}</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex items-center gap-2">
                  <LanguageSwitcher />
                </div>
                {actions}
              </div>
            </div>
          </div>
          <div className="px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
