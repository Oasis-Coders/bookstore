'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { hasSupabaseServiceRole } from '@/lib/supabase/env';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey };
}

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirectTo') ?? '/');

  if (!email || !password) {
    redirect(`/auth?error=missing&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const env = getSupabase();
  if (!env) {
    redirect(`/auth?error=no-supabase&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options as any)
        );
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/auth?error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  redirect(redirectTo);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  const redirectTo = String(formData.get('redirectTo') ?? '/');

  if (!email || !password || !displayName) {
    redirect(`/auth?mode=signup&error=missing&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (password !== confirmPassword) {
    redirect(`/auth?mode=signup&error=${encodeURIComponent('两次密码不一致')}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (password.length < 6) {
    redirect(`/auth?mode=signup&error=${encodeURIComponent('密码至少6位')}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const env = getSupabase();
  if (!env) {
    redirect(`/auth?mode=signup&error=no-supabase&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  // Like COCM: if we have service role, use admin.createUser with email_confirm: true to skip email verification
  if (hasSupabaseServiceRole()) {
    const adminSupabase = createSupabaseAdminClient();
    if (adminSupabase) {
      const { data, error } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
        },
      });

      if (error || !data.user) {
        redirect(`/auth?mode=signup&error=${encodeURIComponent(error?.message || '创建失败')}&redirectTo=${encodeURIComponent(redirectTo)}`);
      }

      // Auto sign in after creation
      const cookieStore = await cookies();
      const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            );
          },
        },
      });

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        redirect(`/auth?message=${encodeURIComponent('账号已创建，请登录')}&redirectTo=${encodeURIComponent(redirectTo)}`);
      }

      redirect(redirectTo);
    }
  }

  // Fallback: regular signUp (may require email confirmation if Supabase setting is on)
  const cookieStore = await cookies();
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options as any)
        );
      },
    },
  });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error || !data.user) {
    redirect(`/auth?mode=signup&error=${encodeURIComponent(error?.message || '注册失败')}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (data.session) {
    // Already signed in (email confirmation disabled)
    redirect(redirectTo);
  }

  // No session means email confirmation required
  redirect(`/auth?message=${encodeURIComponent('账号创建成功，请去邮箱确认后登录')}&redirectTo=${encodeURIComponent(redirectTo)}`);
}

export async function signOut() {
  const env = getSupabase();
  if (env) {
    const cookieStore = await cookies();
    const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as any)
          );
        },
      },
    });
    await supabase.auth.signOut();
  }
  redirect('/auth');
}
