'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/get-role';

export async function updateUserRole(userId: string, roleName: 'staff' | 'admin' | 'super_admin') {
  const { isSuperAdmin } = await getUserRole();
  if (!isSuperAdmin) throw new Error('只有 super_admin 可以修改人员角色');

  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  // Get role id
  const { data: role } = await supabase.from('roles').select('id').eq('name', roleName).single();
  if (!role) throw new Error('角色不存在');

  // Remove existing roles
  await supabase.from('user_roles').delete().eq('user_id', userId);
  
  // Insert new role
  const { error } = await supabase.from('user_roles').insert({ user_id: userId, role_id: role.id });
  if (error) throw error;

  revalidatePath('/admin/users');
}

export async function removeUserRole(userId: string) {
  const { isSuperAdmin } = await getUserRole();
  if (!isSuperAdmin) throw new Error('只有 super_admin 可以操作');

  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
  if (error) throw error;
  revalidatePath('/admin/users');
}
