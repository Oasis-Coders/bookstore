import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  let profile: any = null;
  let user: any = null;

  if (supabase) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    user = authUser;
    if (authUser) {
      const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      profile = data;
    }
  }

  return <SettingsClient profile={profile} user={user} />;
}
