'use server';
import { createSupabaseServiceRoleClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/get-role';

export async function getUsersWithEmails() {
  const { isSuperAdmin } = await getUserRole();
  if (!isSuperAdmin) throw new Error('需要 super_admin 权限');

  const serviceSupabase = await createSupabaseServiceRoleClient();
  const supabase = await createSupabaseServerClient();
  const client = serviceSupabase || supabase;
  if (!client) throw new Error('Supabase not configured');

  // Get profiles
  const { data: profiles } = await client.from('profiles').select('*').order('created_at', { ascending: false });

  // Get emails via auth admin API if service client available
  let emailMap: Record<string, string> = {};
  if (serviceSupabase) {
    try {
      const { data: { users }, error } = await serviceSupabase.auth.admin.listUsers();
      if (!error && users) {
        users.forEach((u: any) => {
          emailMap[u.id] = u.email || '';
        });
      }
    } catch (e) {
      // Fallback: try to get from auth.users via SQL if possible, otherwise leave empty
    }
  }

  // Merge
  const enriched = (profiles || []).map((p: any) => ({
    ...p,
    email: emailMap[p.id] || p.email || '',
  }));

  // Get roles
  const { data: ur } = await client.from('user_roles').select('user_id, roles(name)');
  const roleMap: Record<string, string> = {};
  (ur as any[] || []).forEach((row: any) => {
    roleMap[row.user_id] = row.roles?.name || '';
  });

  return { profiles: enriched, roleMap };
}
