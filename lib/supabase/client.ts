'use client';

import { createBrowserClient } from '@supabase/ssr';

import { getSupabaseUrl, getSupabaseAnonKey, hasSupabaseEnv } from '@/lib/supabase/env';

export function createSupabaseBrowserClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  return createBrowserClient(getSupabaseUrl()!, getSupabaseAnonKey()!);
}
