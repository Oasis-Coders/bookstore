import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LocationsClient } from './locations-client';

export default async function LocationsPage() {
  const supabase = await createSupabaseServerClient();
  let locations: any[] = [];
  let mode: 'demo' | 'live' = 'demo';

  if (supabase) {
    try {
      const { data } = await supabase.from('locations').select('*').eq('is_active', true).order('code');
      if (data) {
        locations = data;
        mode = 'live';
      }
    } catch {}
  }

  if (mode === 'demo' && locations.length === 0) {
    locations = [
      { id: '1', code: 'STORE-MAIN', name: '书店门店', location_type: 'store', address: '伦敦活水书房' },
      { id: '2', code: 'WH-01', name: '仓库', location_type: 'warehouse', address: '后仓' },
    ];
  }

  return <LocationsClient locations={locations} />;
}
