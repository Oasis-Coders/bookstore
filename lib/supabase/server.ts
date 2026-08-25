import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceRoleKey, hasSupabaseEnv, hasSupabaseServiceRole } from '@/lib/supabase/env';

export async function createSupabaseServerClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const cookieStore = await cookies();
  type CookieToSet = {
    name: string;
    value: string;
    options?: Parameters<typeof cookieStore.set>[2];
  };

  return createServerClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {}
      },
    },
  });
}

export async function createSupabaseServiceRoleClient() {
  if (!hasSupabaseServiceRole()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });
}

// For backward compat with existing code that checks URL and service role separately
export function hasSupabaseServiceEnv(): boolean {
  return hasSupabaseServiceRole();
}
