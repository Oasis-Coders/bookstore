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
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      const meta = data.user?.user_metadata as any;
      if (meta?.avatar_icon) setAvatarIcon(meta.avatar_icon);
      if (meta?.avatar_color) setAvatarColor(meta.avatar_color);
      if (meta?.display_name) setDisplayName(meta.display_name);
      
      if (data.user) {
        try {
          // Try join query first
          const { data: roles, error } = await supabase.from('user_roles').select('roles(name)').eq('user_id', data.user.id);
          if (!error && roles && roles.length > 0) {
            const roleNames = (roles || []).map((r: any) => r.roles?.name).filter(Boolean);
            const isSuperAdmin = roleNames.includes('super_admin');
            const isAdmin = isSuperAdmin || roleNames.includes('admin');
            setUserRole(isSuperAdmin ? 'super_admin' : isAdmin ? 'admin' : roleNames[0] || 'staff');
            return;
          }
          // Fallback: try direct role_id then lookup
          const { data: direct } = await supabase.from('user_roles').select('role_id').eq('user_id', data.user.id).limit(1).single();
          if (direct?.role_id) {
            const { data: role } = await supabase.from('roles').select('name').eq('id', direct.role_id).single();
            if (role?.name) {
              setUserRole(role.name);
              return;
            }
          }
          // If still no role, keep null to show admin links optimistically (avoid flash-hide for super_admin)
          console.log('no role found, keeping optimistic');
        } catch (e) {
          console.log('role fetch error', e);
          // Keep null to avoid hiding admin links
        }
      }
    });
  }, []);

  // FIX: Don't hide admin links based on role detection failure.
  // Show all links always, only hide for confirmed staff to avoid flash-hide bug.
  // Page-level auth (/admin/*) will redirect non-admins anyway.
  const filteredNav = navItems.filter(item => {
    if (!item.roles) return true;
    // Only hide admin links if we are 100% sure user is staff
    if (userRole === 'staff') return false;
    // For super_admin, admin, null/loading -> show
    return true;
  });

  const navToShow = filteredNav;

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
                  {userRole && <span className="rounded-[6px] bg-white/15 px-1.5 py-0.5 text-[10px] text-white/80">{userRole}</span>}
                </div>
                <h1 className="mt-1.5 font-serif text-[20px] leading-tight tracking-tight text-white">
                  {isZh ? '活水书房' : 'COCM Bookshop'}
                  <br />
                  <span className="text-[12px] font-sans font-normal tracking-wide opacity-70">{displayName || (isZh ? '书店管理系统' : 'Bookshop System')}</span>
                </h1>
              </div>
            </div>
            <LanguageSwitcherDark />
          </div>

          <div className="mt-6 flex min-h-0 flex-1 flex-col">
            <SidebarNav items={navToShow} />
            {userRole === 'super_admin' && (
              <div className="mt-3 rounded-[12px] bg-white/10 px-3 py-2 text-[11px] text-white/60">
                super_admin 模式
              </div>
            )}
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
