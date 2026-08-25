import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createLocation } from '../actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';

async function createLocationAction(formData: FormData) {
  'use server';
  try {
    await createLocation(formData);
  } catch (e: any) {
    redirect(`/locations/new?error=${encodeURIComponent(e.message)}`);
  }
  redirect('/locations');
}

export default async function NewLocationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AppShell title="New Location" titleZh="添加库位" eyebrow="活水书房">
      <div className="mx-auto max-w-[480px]">
        <Link href="/locations" className="mb-4 inline-flex text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">← 返回库位</Link>
        <Card>
          <CardTitle>添加库位</CardTitle>
          {error && <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}
          <form action={createLocationAction} className="mt-6 space-y-4">
            <div><label className="text-[12px] font-semibold">代号 *</label><Input name="code" placeholder="STORE-MAIN" required className="mt-1" /></div>
            <div><label className="text-[12px] font-semibold">名称 *</label><Input name="name" placeholder="书店门店" required className="mt-1" /></div>
            <div><label className="text-[12px] font-semibold">类型</label>
              <select name="location_type" className="mt-1 flex h-11 w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 text-[13px]">
                <option value="store">门店 store</option>
                <option value="warehouse">仓库 warehouse</option>
              </select>
            </div>
            <div><label className="text-[12px] font-semibold">地址</label><Input name="address" className="mt-1" /></div>
            <div className="flex gap-2 pt-2">
              <Link href="/locations" className="flex-1"><Button variant="ghost" className="w-full" type="button">取消</Button></Link>
              <Button type="submit" className="flex-1">创建</Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
