'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n/use-t';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { updateUserRole } from './actions';

type Profile = { id: string; display_name?: string | null; created_at?: string };
type RoleRow = { user_id: string; roles?: { name: string } | null };

export default function AdminUsersPage() {
  const { lang, isZh } = useT();
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setLoading(false);
        return;
      }

      // current user
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        router.push('/auth?redirectTo=/admin/users');
        return;
      }

      // current user roles
      const { data: myRoles } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', user.id);

      const roleNames = (myRoles || []).map((r: any) => r.roles?.name).filter(Boolean) as string[];
      const superAdmin = roleNames.includes('super_admin');
      const admin = superAdmin || roleNames.includes('admin');
      setIsSuperAdmin(superAdmin);
      setIsAdmin(admin);
      setCurrentRole(superAdmin ? 'super_admin' : admin ? 'admin' : roleNames[0] || 'staff');

      if (!admin) {
        router.push('/');
        return;
      }

      // all profiles
      const { data: profs } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setProfiles((profs as any) || []);

      // all user_roles
      const { data: ur } = await supabase.from('user_roles').select('user_id, roles(name)');
      const m: Record<string, string> = {};
      (ur as any[] || []).forEach((row: any) => {
        m[row.user_id] = row.roles?.name || '';
      });
      setRoleMap(m);
      setLoading(false);
    };
    run();
  }, [router]);

  const handleRoleChange = async (userId: string, newRole: 'staff' | 'admin' | 'super_admin') => {
    setUpdating(userId + newRole);
    setErrorMsg('');
    try {
      await updateUserRole(userId, newRole);
      setRoleMap((prev) => ({ ...prev, [userId]: newRole }));
    } catch (e: any) {
      setErrorMsg(e.message || (isZh ? '更新失败' : 'Update failed'));
    } finally {
      setUpdating(null);
    }
  };

  const eyebrow = currentRole
    ? `${currentRole} • ${isSuperAdmin ? (isZh ? '可修改' : 'editable') : isZh ? '只读' : 'read-only'}`
    : isZh
    ? '加载中…'
    : 'Loading…';

  if (loading) {
    return (
      <AppShell title="Users" titleZh="人员管理" eyebrow={eyebrow}>
        <div className="mx-auto max-w-[840px]">
          <Card>
            <p className="text-[12px] text-[#4f7a5c]">{isZh ? '加载中…' : 'Loading…'}</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Users" titleZh="人员管理" eyebrow={eyebrow}>
      <div className="mx-auto max-w-[840px] space-y-4">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>{isZh ? '人员列表' : 'Personnel'}</CardTitle>
            <Badge variant={isSuperAdmin ? 'active' : 'default'}>
              {isSuperAdmin ? (isZh ? 'super_admin 可改' : 'super_admin editable') : isZh ? 'admin 只读' : 'admin read-only'}
            </Badge>
          </div>
          <p className="mt-2 text-[12px] text-[#4f7a5c]">
            {isSuperAdmin
              ? isZh
                ? '你可以修改每个人的角色'
                : 'You can change each user\'s role'
              : isZh
              ? '你只能查看，修改需要 super_admin'
              : 'Read-only — super_admin required to edit'}
          </p>

          {errorMsg && (
            <div className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{errorMsg}</div>
          )}

          <div className="mt-4 space-y-2">
            {profiles.map((p: any) => {
              const r = roleMap[p.id] || (isZh ? '无角色' : 'no role');
              const shortId = p.id.slice(0, 8);
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#0f3d2e]/10 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{p.display_name || shortId}</p>
                    <p className="truncate text-[11px] text-[#4f7a5c]">
                      {p.id.slice(0, 8)}… • {new Date(p.created_at || Date.now()).toLocaleDateString(isZh ? 'zh-CN' : 'en-GB')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r === 'super_admin' ? 'danger' : r === 'admin' ? 'active' : 'default'}>{r}</Badge>
                    {isSuperAdmin && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px]"
                          disabled={!!updating}
                          onClick={() => handleRoleChange(p.id, 'staff')}
                        >
                          staff
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px]"
                          disabled={!!updating}
                          onClick={() => handleRoleChange(p.id, 'admin')}
                        >
                          admin
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px]"
                          disabled={!!updating}
                          onClick={() => handleRoleChange(p.id, 'super_admin')}
                        >
                          super
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {profiles.length === 0 && (
              <p className="py-8 text-center text-[12px] text-[#4f7a5c]">{isZh ? '暂无人员' : 'No personnel'}</p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>{isZh ? '权限说明' : 'Permissions'}</CardTitle>
          <div className="mt-3 space-y-2 text-[12px] text-[#0f3d2e]/80">
            <p>
              <Badge>staff</Badge>{' '}
              {isZh ? '只能操作日常：图书、采购、销售、库存' : 'Daily ops only: books, POs, sales, inventory'}
            </p>
            <p>
              <Badge variant="active">admin</Badge>{' '}
              {isZh
                ? '可查看人员和操作记录，但不能改角色'
                : 'Can view personnel & audit logs, cannot change roles'}
            </p>
            <p>
              <Badge variant="danger">super_admin</Badge>{' '}
              {isZh ? '可改所有人员角色，是最高权限' : 'Can change all roles, highest privilege'}
            </p>
          </div>
          <div className="mt-4 rounded-[12px] bg-[#faf6ee] p-3 text-[11px] text-[#4f7a5c]">
            <p>
              {isZh
                ? '首位注册用户自动 super_admin，后续需 super_admin 分配。'
                : 'First registered user auto becomes super_admin, subsequent roles assigned by super_admin.'}
            </p>
            <p className="mt-1 font-mono">
              insert into user_roles(user_id, role_id) select '&lt;uuid&gt;', id from roles where name='super_admin'
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
