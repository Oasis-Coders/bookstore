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
      if (meta?.display_name) setDisplayName(meta.display_name);
      // avatar_icon: use saved icon, else first char of display_name, else first char of email, else 活
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
          console.log('no role found, keeping optimistic');
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

  return (
    <div className="min-h-screen bg-[#faf6ee]">
      <MobileSidebar items={filteredNav} avatarIcon={avatarIcon} avatarColor={avatarColor} displayName={displayName} userRole={userRole} />
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[240px] shrink-0 flex-col rounded-[24px] bg-[#0f3d2e] text-white lg:flex">
          <div className="relative overflow-hidden rounded-t-[24px]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#d26a39]/20 via-transparent to-transparent" />
            <div className="relative px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/15 text-[15px] font-bold" style={{ backgroundColor: avatarColor }}>
                  {avatarIcon}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold leading-tight">{displayName || (isZh ? '活水书房' : 'COCM Bookshop')}</p>
                  <span className="text-[11px] font-sans font-normal tracking-wide opacity-70">{displayName ? (isZh ? '书店管理系统' : 'Bookshop System') : (isZh ? '书店管理系统' : 'Bookshop System')}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <SidebarNav items={filteredNav} />
          </div>
          <div className="border-t border-white/10 px-3 py-3">
            <LanguageSwitcherDark />
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="rounded-[28px] border border-[#0f3d2e]/10 bg-white p-6 shadow-[rgba(15,61,46,0.03)_0px_0px_0px_1px,rgba(15,61,46,0.05)_0px_2px_8px,rgba(15,61,46,0.10)_0px_8px_24px] lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4f7a5c]">{eyebrow}</p>}
                <h1 className="mt-1 font-serif text-[28px] leading-tight tracking-tight">{isZh ? titleZh : title}</h1>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden lg:block"><LanguageSwitcher /></div>
                {actions}
              </div>
            </div>
          </div>
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
