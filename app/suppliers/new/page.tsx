import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createSupplier } from '../actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';

async function createSupplierAction(formData: FormData) {
  'use server';
  try {
    await createSupplier(formData);
  } catch (e: any) {
    redirect(`/suppliers/new?error=${encodeURIComponent(e.message)}`);
  }
  redirect('/suppliers');
}

export default async function NewSupplierPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AppShell title="New Supplier" titleZh="添加供应商" eyebrow="活水书房">
      <div className="mx-auto max-w-[640px]">
        <Link href="/suppliers" className="mb-4 inline-flex text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">← 返回供应商</Link>
        <Card>
          <CardTitle>添加供应商</CardTitle>
          {error && <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}
          <form action={createSupplierAction} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[12px] font-semibold">代号 *</label><Input name="code" placeholder="SUP-001" required className="mt-1" /></div>
              <div><label className="text-[12px] font-semibold">付款条件</label><Input name="payment_terms" placeholder="月结30天" className="mt-1" /></div>
            </div>
            <div><label className="text-[12px] font-semibold">中文名称 *</label><Input name="name_zh" required className="mt-1" /></div>
            <div><label className="text-[12px] font-semibold">英文名称</label><Input name="name_en" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[12px] font-semibold">联系人</label><Input name="contact_name" className="mt-1" /></div>
              <div><label className="text-[12px] font-semibold">电话</label><Input name="phone" className="mt-1" /></div>
            </div>
            <div><label className="text-[12px] font-semibold">邮箱</label><Input name="email" type="email" className="mt-1" /></div>
            <div><label className="text-[12px] font-semibold">地址</label><Input name="address" className="mt-1" /></div>
            <div><label className="text-[12px] font-semibold">备注</label><Input name="notes" className="mt-1" /></div>
            <div className="flex gap-2 pt-2">
              <Link href="/suppliers" className="flex-1"><Button variant="ghost" className="w-full" type="button">取消</Button></Link>
              <Button type="submit" className="flex-1">创建</Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
