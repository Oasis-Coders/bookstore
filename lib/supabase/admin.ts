import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { getSupabaseUrl, getSupabaseServiceRoleKey, hasSupabaseServiceRole } from '@/lib/supabase/env';

export function createSupabaseAdminClient() {
  if (!hasSupabaseServiceRole()) {
    return null;
  }

  return createClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
