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
    // Better error for wrong password / not confirmed
    if (error.message.includes('Invalid login credentials')) {
      redirect(`/auth?error=${encodeURIComponent('邮箱或密码错误')}&redirectTo=${encodeURIComponent(redirectTo)}`);
    }
    if (error.message.includes('Email not confirmed')) {
      redirect(`/auth?error=${encodeURIComponent('邮箱未确认，请去邮箱点链接或联系管理员')}&redirectTo=${encodeURIComponent(redirectTo)}`);
    }
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

  // Like COCM: if we have service role, use admin.createUser with email_confirm: true
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
        // If user already exists, give helpful message
        if (error?.message.includes('already exists') || error?.message.includes('already registered')) {
          redirect(`/auth?error=${encodeURIComponent('该邮箱已注册，请直接登录或重置密码')}&redirectTo=${encodeURIComponent(redirectTo)}`);
        }
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

  // Fallback: regular signUp
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
    if (error?.message.includes('already registered')) {
      redirect(`/auth?error=${encodeURIComponent('该邮箱已注册，请直接登录')}&redirectTo=${encodeURIComponent(redirectTo)}`);
    }
    redirect(`/auth?mode=signup&error=${encodeURIComponent(error?.message || '注册失败')}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (data.session) {
    redirect(redirectTo);
  }

  redirect(`/auth?message=${encodeURIComponent('账号创建成功，请去邮箱确认后登录')}&redirectTo=${encodeURIComponent(redirectTo)}`);
}

export async function resetPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const redirectTo = String(formData.get('redirectTo') ?? '/');

  if (!email) {
    redirect(`/auth?mode=reset&error=missing&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const env = getSupabase();
  if (!env) {
    redirect(`/auth?mode=reset&error=no-supabase&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {},
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cocm-bookstor.vercel.app';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset`,
  });

  if (error) {
    redirect(`/auth?mode=reset&error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  redirect(`/auth?message=${encodeURIComponent('重置邮件已发送，请查收邮箱')}&redirectTo=${encodeURIComponent(redirectTo)}`);
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '').trim();
  const confirmPassword = String(formData.get('confirmPassword') ?? '').trim();
  const redirectTo = String(formData.get('redirectTo') ?? '/');

  if (!password || password !== confirmPassword) {
    redirect(`/auth/reset?error=${encodeURIComponent('两次密码不一致')}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (password.length < 6) {
    redirect(`/auth/reset?error=${encodeURIComponent('密码至少6位')}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const env = getSupabase();
  if (!env) {
    redirect(`/auth/reset?error=no-supabase&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

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

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/reset?error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  redirect(redirectTo || '/');
}

export async function adminResetPassword(formData: FormData) {
  // Admin function to reset a user's password directly (for the case where user forgot password and admin wants to help)
  const email = String(formData.get('email') ?? '').trim();
  const newPassword = String(formData.get('newPassword') ?? '').trim();
  const redirectTo = String(formData.get('redirectTo') ?? '/');

  if (!email || !newPassword) {
    redirect(`/auth?mode=admin-reset&error=missing&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (!hasSupabaseServiceRole()) {
    redirect(`/auth?mode=admin-reset&error=${encodeURIComponent('需要 service role key')}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const adminSupabase = createSupabaseAdminClient();
  if (!adminSupabase) {
    redirect(`/auth?mode=admin-reset&error=no-admin&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  // Find user by email
  const { data: listData, error: listError } = await adminSupabase.auth.admin.listUsers();
  if (listError) {
    redirect(`/auth?mode=admin-reset&error=${encodeURIComponent(listError.message)}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const user = listData.users.find((u: any) => u.email === email);
  if (!user) {
    redirect(`/auth?mode=admin-reset&error=${encodeURIComponent('用户不存在')}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (error) {
    redirect(`/auth?mode=admin-reset&error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  redirect(`/auth?message=${encodeURIComponent(`已重置 ${email} 的密码`)}&redirectTo=${encodeURIComponent(redirectTo)}`);
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
