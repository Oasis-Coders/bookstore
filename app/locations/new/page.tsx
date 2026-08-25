'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n/use-t';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createLocation } from '../actions';
import Link from 'next/link';

export default function NewLocationPage() {
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
      await createLocation(fd);
      router.push('/locations');
    } catch (err: any) {
      setError(err?.message || (isZh ? '创建失败' : 'Failed to create'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="New Location" titleZh="添加库位" eyebrow="活水书房">
      <div className="mx-auto max-w-[480px]">
        <Link href="/locations" className="mb-4 inline-flex text-[13px] text-[#4f7a5c] hover:text-[#0f3d2e]">
          {isZh ? '← 返回库位' : '← Back to Locations'}
        </Link>
        <Card>
          <CardTitle>{isZh ? '添加库位' : 'Add Location'}</CardTitle>
          {error && <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '代号 *' : 'Code *'}</label>
              <Input name="code" placeholder="STORE-MAIN" required className="mt-1" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '名称 *' : 'Name *'}</label>
              <Input name="name" placeholder={isZh ? '书店门店' : 'e.g. Main Store'} required className="mt-1" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '类型' : 'Type'}</label>
              <select name="location_type" className="mt-1 flex h-11 w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 text-[13px]">
                <option value="store">{isZh ? '门店' : 'Store'}</option>
                <option value="warehouse">{isZh ? '仓库' : 'Warehouse'}</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">{isZh ? '地址' : 'Address'}</label>
              <Input name="address" placeholder={isZh ? '地址' : 'Address'} className="mt-1" />
            </div>
            <div className="flex gap-2 pt-2">
              <Link href="/locations" className="flex-1">
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
