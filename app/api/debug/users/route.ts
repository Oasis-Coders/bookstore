import { NextResponse } from 'next/server';

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  return { url, anonKey, serviceKey };
}

export async function GET() {
  const { url, serviceKey } = getEnv();

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Supabase env missing', hasUrl: !!url, hasServiceKey: !!serviceKey },
      { status: 500 }
    );
  }

  try {
    // Use Supabase Admin API to list users
    const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=10`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: `Supabase admin API failed: ${res.status}`, details: txt }, { status: 500 });
    }

    const data = await res.json();
    const users = data.users || data || [];

    // Also check profiles via anon
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(url, serviceKey);
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, created_at')
      .limit(10);

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, roles(name)')
      .limit(10);

    return NextResponse.json({
      authUsersCount: Array.isArray(users) ? users.length : 0,
      authUsers: Array.isArray(users) ? users.map((u: any) => ({
        id: u.id,
        email: u.email,
        email_confirmed_at: u.email_confirmed_at,
        confirmed_at: u.confirmed_at,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        raw_user_meta_data: u.raw_user_meta_data,
      })) : [],
      profiles: profiles || [],
      profilesError: profilesError?.message,
      userRoles: roles || [],
      rolesError: rolesError?.message,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
