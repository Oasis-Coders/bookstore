import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getUserRole(): Promise<{ userId: string | null; role: string | null; isAdmin: boolean; isSuperAdmin: boolean; isStaff: boolean }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { userId: null, role: null, isAdmin: false, isSuperAdmin: false, isStaff: false };
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: null, isAdmin: false, isSuperAdmin: false, isStaff: false };

  const { data: roles } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  const roleNames = (roles || []).map((r: any) => r.roles?.name).filter(Boolean);
  const isSuperAdmin = roleNames.includes('super_admin');
  const isAdmin = isSuperAdmin || roleNames.includes('admin');
  const isStaff = isAdmin || roleNames.includes('staff');
  const primaryRole = isSuperAdmin ? 'super_admin' : isAdmin ? 'admin' : roleNames[0] || 'staff';

  return { userId: user.id, role: primaryRole, isAdmin, isSuperAdmin, isStaff };
}
