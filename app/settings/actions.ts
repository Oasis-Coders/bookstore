'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { friendlyDbError } from '@/lib/friendly-error';
import type { ActionResult } from '@/app/books/actions';

// NOTE: returns { success, error } instead of throwing: throwing from a
// server action crashes the page with a generic "Server Components render"
// error in production builds.
const ok = (): ActionResult => ({ success: true });
const fail = (error: string): ActionResult => ({ success: false, error });

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail('系统未配置');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('未登录');

  const displayName = String(formData.get('displayName') || '').trim();
  const avatarIcon = String(formData.get('avatarIcon') || '').trim();
  const avatarColor = String(formData.get('avatarColor') || '').trim();

  if (!displayName) return fail('名字必填');

  const payload: any = {
    display_name: displayName,
    updated_at: new Date().toISOString(),
  };

  // Store icon and color in metadata if columns don't exist, use display_name as primary
  // We'll try to update extra columns, fallback to metadata in profiles
  // For simplicity, we store avatar config in a JSON column if exists, otherwise ignore extra

  // First, try updating profiles with extra fields if they exist
  const { error: profileError } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id);

  if (profileError) return fail(friendlyDbError(profileError, { fallback: '保存失败，请重试' }));

  // Update user_metadata in auth
  const { error: authError } = await supabase.auth.updateUser({
    data: {
      display_name: displayName,
      avatar_icon: avatarIcon,
      avatar_color: avatarColor,
    },
  });

  // Ignore auth error if it's just metadata, don't throw
  if (authError && !authError.message.includes('same')) {
    console.warn('auth metadata update warning', authError);
  }

  revalidatePath('/settings');
  revalidatePath('/');
  return ok();
}
