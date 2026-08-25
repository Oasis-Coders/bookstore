import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getUserRole } from '@/lib/auth/get-role';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { updateUserRole } from './actions';

export default async function AdminUsersPage() {
  const { role, isAdmin, isSuperAdmin } = await getUserRole();
  if (!isAdmin) redirect('/');

  const supabase = await createSupabaseServerClient();
  if (!supabase) return <div>Demo mode</div>;

  // Get all profiles with roles
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  const { data: userRoles } = await supabase.from('user_roles').select('user_id, roles(name)');

  const roleMap: Record<string, string> = {};
  (userRoles || []).forEach((ur: any) => {
    roleMap[ur.user_id] = ur.roles?.name || '';
  });

  // Try to get auth users for emails via admin client
  let emailMap: Record<string, string> = {};
  try {
    const admin = createSupabaseAdminClient();
    if (admin) {
      const { data } = await admin.auth.admin.listUsers();
      (data.users || []).forEach((u: any) => {
        emailMap[u.id] = u.email || '';
      });
    }
  } catch {}

  return (
    <AppShell title="Users" titleZh="人员管理" eyebrow={`${role} • ${isSuperAdmin ? '可修改' : '只读'}`}>
      <div className="mx-auto max-w-[840px] space-y-4">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>人员列表</CardTitle>
            <Badge variant={isSuperAdmin ? 'active' : 'default'}>{isSuperAdmin ? 'super_admin 可改' : 'admin 只读'}</Badge>
          </div>
          <p className="mt-2 text-[12px] text-[#4f7a5c]">{isSuperAdmin ? '你可以修改每个人的角色' : '你只能查看，修改需要 super_admin'}</p>

          <div className="mt-4 space-y-2">
            {(profiles || []).map((p: any) => {
              const r = roleMap[p.id] || '无角色';
              const email = emailMap[p.id] || p.id.slice(0,8);
              return (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#0f3d2e]/10 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold truncate">{p.display_name || email}</p>
                    <p className="text-[11px] text-[#4f7a5c] truncate">{email} • {p.id.slice(0,8)}…</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r === 'super_admin' ? 'danger' : r === 'admin' ? 'active' : 'default'}>{r}</Badge>
                    {isSuperAdmin && (
                      <div className="flex gap-1">
                        <form action={async () => { 'use server'; await updateUserRole(p.id, 'staff'); }}><Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">staff</Button></form>
                        <form action={async () => { 'use server'; await updateUserRole(p.id, 'admin'); }}><Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">admin</Button></form>
                        <form action={async () => { 'use server'; await updateUserRole(p.id, 'super_admin'); }}><Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">super</Button></form>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(!profiles || profiles.length === 0) && <p className="py-8 text-center text-[12px] text-[#4f7a5c]">暂无人员</p>}
          </div>
        </Card>

        <Card>
          <CardTitle>权限说明</CardTitle>
          <div className="mt-3 space-y-2 text-[12px] text-[#0f3d2e]/80">
            <p><Badge>staff</Badge> 只能操作日常：图书、采购、销售、库存</p>
            <p><Badge variant="active">admin</Badge> 可查看人员和操作记录，但不能改角色</p>
            <p><Badge variant="danger">super_admin</Badge> 可改所有人员角色，是最高权限</p>
          </div>
          <div className="mt-4 rounded-[12px] bg-[#faf6ee] p-3 text-[11px] text-[#4f7a5c]">
            <p>首位注册用户自动 super_admin，后续需 super_admin 分配。</p>
            <p className="mt-1 font-mono">insert into user_roles(user_id, role_id) select '&lt;uuid&gt;', id from roles where name='super_admin'</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
