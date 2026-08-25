'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/get-role';

export async function updateUserRole(userId: string, roleName: 'staff' | 'admin' | 'super_admin') {
  const { isSuperAdmin, userId: currentUserId } = await getUserRole();
  if (!isSuperAdmin) throw new Error('只有 super_admin 可以修改人员角色 / Only super_admin can change roles');

  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  const serviceSupabase = await createSupabaseServiceRoleClient();
  const client = serviceSupabase || supabase;

  // Get role id - use service client to ensure read
  const { data: role, error: roleErr } = await client.from('roles').select('id').eq('name', roleName).single();
  if (roleErr || !role) throw new Error(`角色不存在: ${roleName} / Role not found: ${roleName}`);

  // Safety: prevent demoting self if last super_admin
  if (userId === currentUserId && roleName !== 'super_admin') {
    const { count } = await client.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role_id', role.id);
    // Actually check super_admin count
    const { data: superRole } = await client.from('roles').select('id').eq('name', 'super_admin').single();
    if (superRole) {
      const { count: superCount } = await client.from('user_roles').select('*', { count: 'exact', head: true }).eq('role_id', superRole.id);
      if ((superCount || 0) <= 1) {
        throw new Error('不能移除最后一个 super_admin / Cannot remove last super_admin');
      }
    }
  }

  // Remove existing roles using service client to bypass RLS race
  const { error: delErr } = await client.from('user_roles').delete().eq('user_id', userId);
  if (delErr) {
    // If delete fails due to RLS when using anon client, try with service
    if (client === supabase && serviceSupabase) {
      const { error: delErr2 } = await serviceSupabase.from('user_roles').delete().eq('user_id', userId);
      if (delErr2) throw delErr2;
    } else if (delErr) {
      throw delErr;
    }
  }
  
  // Insert new role
  const { error: insErr } = await client.from('user_roles').insert({ user_id: userId, role_id: role.id });
  if (insErr) throw insErr;

  revalidatePath('/admin/users');
  return { success: true };
}

export async function removeUserRole(userId: string) {
  const { isSuperAdmin } = await getUserRole();
  if (!isSuperAdmin) throw new Error('只有 super_admin 可以操作 / Only super_admin can operate');

  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  const serviceSupabase = await createSupabaseServiceRoleClient();
  const client = serviceSupabase || supabase;

  const { error } = await client.from('user_roles').delete().eq('user_id', userId);
  if (error) throw error;
  revalidatePath('/admin/users');
  return { success: true };
}
