'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey };
}

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
      setAll(cookiesToSet) {
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

export async function signOut() {
  const env = getSupabase();
  if (env) {
    const cookieStore = await cookies();
    const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
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
