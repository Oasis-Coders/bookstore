import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { EditBookClient } from './edit-client';
import { getPurchaseCosts } from '@/lib/books/queries';

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <div>Not configured</div>;

  const { data: book, error } = await supabase.from('books').select('*').eq('id', id).single();
  if (error || !book) notFound();

  // 1C: 已分配的内部备用条码（如有）
  let spareBarcode: string | null = null;
  try {
    const { data: spare } = await supabase.from('spare_barcodes').select('code').eq('assigned_book_id', id).eq('status', 'assigned').limit(1).maybeSingle();
    spareBarcode = (spare as any)?.code || null;
  } catch {}

  // Check if current user can delete (admin or super_admin)
  let canDelete = false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
      const roleNames = (roles || []).map((r: any) => r.roles?.name);
      canDelete = roleNames.includes('admin') || roleNames.includes('super_admin');
    }
  } catch {}

  // 工单 #18 跟进：全部收货批次的进货价（只读展示）；无批次时用导入价兜底（book.import_unit_cost）
  let purchaseCosts: { unit_cost: number; received_at: string | null; quantity_received: number | null; quantity_remaining: number | null }[] = [];
  try {
    purchaseCosts = await getPurchaseCosts(supabase, id);
  } catch {}

  return <EditBookClient book={book} canDelete={canDelete} spareBarcode={spareBarcode} purchaseCosts={purchaseCosts} />;
}
