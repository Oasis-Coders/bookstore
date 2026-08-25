'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateSupplier, deleteSupplier } from '@/app/suppliers/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function EditSupplierClient({ supplier }: { supplier: any }) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await updateSupplier(supplier.id, new FormData(e.currentTarget));
      setMsg('已保存');
      setTimeout(() => router.push(`/suppliers/${supplier.id}`), 800);
    } catch (err: any) {
      setMsg(err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`删除供应商 ${supplier.name_zh}？`)) return;
    try { await deleteSupplier(supplier.id); router.push('/suppliers'); } catch (e: any) { alert(e.message); }
  };

  return (
    <AppShell title="Edit Supplier" titleZh="编辑供应商" eyebrow={supplier.code}>
      <div className="mx-auto max-w-[640px]">
        <Card>
          <CardTitle>编辑供应商</CardTitle>
          {msg && <div className={`mt-3 rounded-[10px] px-3 py-2 text-[12px] ${msg.includes('失败') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg}</div>}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[11px] text-[#4f7a5c]">代号 *</label><Input name="code" defaultValue={supplier.code} required className="mt-1" /></div>
              <div><label className="text-[11px] text-[#4f7a5c]">状态</label><select name="is_active" defaultValue={String(supplier.is_active)} className="mt-1 w-full rounded-[10px] border px-3 py-2 text-[13px]"><option value="true">启用</option><option value="false">停用</option></select></div>
            </div>
            <div><label className="text-[11px] text-[#4f7a5c]">中文名 *</label><Input name="name_zh" defaultValue={supplier.name_zh} required className="mt-1" /></div>
            <div><label className="text-[11px] text-[#4f7a5c]">英文名</label><Input name="name_en" defaultValue={supplier.name_en || ''} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[11px] text-[#4f7a5c]">联系人</label><Input name="contact_person" defaultValue={supplier.contact_person || ''} className="mt-1" /></div>
              <div><label className="text-[11px] text-[#4f7a5c]">电话</label><Input name="phone" defaultValue={supplier.phone || ''} className="mt-1" /></div>
            </div>
            <div><label className="text-[11px] text-[#4f7a5c]">邮箱</label><Input name="email" defaultValue={supplier.email || ''} className="mt-1" /></div>
            <div><label className="text-[11px] text-[#4f7a5c]">付款条件</label><Input name="payment_terms" defaultValue={supplier.payment_terms || ''} className="mt-1" /></div>
            <div><label className="text-[11px] text-[#4f7a5c]">地址</label><Input name="address" defaultValue={supplier.address || ''} className="mt-1" /></div>
            <div><label className="text-[11px] text-[#4f7a5c]">备注</label><Input name="notes" defaultValue={supplier.notes || ''} className="mt-1" /></div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
              <Link href={`/suppliers/${supplier.id}`}><Button variant="ghost" type="button">返回</Button></Link>
              <Button variant="ghost" type="button" onClick={handleDelete} className="ml-auto text-red-600">删除</Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
