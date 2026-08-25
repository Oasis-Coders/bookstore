'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n/use-t';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createSupplier } from '../actions';
import Link from 'next/link';

export default function NewSupplierPage() {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      await createSupplier(fd);
      router.push('/suppliers');
    } catch (err: any) {
      setError(err?.message || (isZh ? '创建失败' : 'Failed to create'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="New Supplier" titleZh="添加供应商" eyebrow="活水书房">
      <div className="mx-auto max-w-[640px]">
        <Link href="/suppliers" className="mb-4 inline-flex text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">
          {isZh ? '← 返回供应商' : '← Back to Suppliers'}
        </Link>
        <Card>
          <CardTitle>{isZh ? '添加供应商' : 'Add Supplier'}</CardTitle>
          {error && <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '代号 *' : 'Code *'}</label>
                <Input name="code" placeholder="SUP-001" required className="mt-1" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '付款条件' : 'Payment Terms'}</label>
                <Input name="payment_terms" placeholder={isZh ? '月结30天' : 'e.g. Net 30'} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '中文名称 *' : 'Chinese Name *'}</label>
              <Input name="name_zh" placeholder={isZh ? '供应商中文名' : 'Chinese Name'} required className="mt-1" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '英文名称' : 'English Name'}</label>
              <Input name="name_en" placeholder={isZh ? '英文名称' : 'English Name'} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '联系人' : 'Contact'}</label>
                <Input name="contact_person" placeholder={isZh ? '联系人' : 'Contact'} className="mt-1" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '电话' : 'Phone'}</label>
                <Input name="phone" placeholder={isZh ? '电话' : 'Phone'} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '邮箱' : 'Email'}</label>
              <Input name="email" type="email" placeholder="email@example.com" className="mt-1" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '地址' : 'Address'}</label>
              <Input name="address" placeholder={isZh ? '地址' : 'Address'} className="mt-1" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '备注' : 'Notes'}</label>
              <Input name="notes" placeholder={isZh ? '备注' : 'Notes'} className="mt-1" />
            </div>
            <div className="flex gap-2 pt-2">
              <Link href="/suppliers" className="flex-1">
                <Button variant="ghost" className="w-full" type="button">{isZh ? '取消' : 'Cancel'}</Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? (isZh ? '创建中…' : 'Creating…') : isZh ? '创建' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
