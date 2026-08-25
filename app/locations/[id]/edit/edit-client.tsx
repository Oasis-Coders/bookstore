'use client';
import { useT } from '@/lib/i18n/use-t';
import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateLocation, deleteLocation } from '@/app/locations/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function EditLocationClient({ location }: { location: any }) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();
  const { lang, isZh } = useT();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await updateLocation(location.id, new FormData(e.currentTarget));
      setMsg(isZh ? '已保存' : 'Saved');
      setTimeout(() => router.push('/locations'), 800);
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(isZh ? `删除库位 ${location.name}？` : `Delete location ${location.name}?`)) return;
    try {
      await deleteLocation(location.id);
      router.push('/locations');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <AppShell title="Edit Location" titleZh="编辑库位" eyebrow={location.code}>
      <div className="mx-auto max-w-[520px]">
        <Card>
          <CardTitle>{isZh ? '编辑库位' : 'Edit Location'}</CardTitle>
          {msg && (
            <div
              className={`mt-3 rounded-[10px] px-3 py-2 text-[12px] ${
                msg.includes('失败') || msg.toLowerCase().includes('fail') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              }`}
            >
              {msg}
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#4f7a5c]">{isZh ? '代号 *' : 'Code *'}</label>
                <Input name="code" defaultValue={location.code} required className="mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[#4f7a5c]">{isZh ? '类型' : 'Type'}</label>
                <select
                  name="location_type"
                  defaultValue={location.location_type}
                  className="mt-1 w-full rounded-[10px] border px-3 py-2 text-[13px]"
                >
                  <option value="store">{isZh ? '门店' : 'Store'}</option>
                  <option value="warehouse">{isZh ? '仓库' : 'Warehouse'}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[#4f7a5c]">{isZh ? '名称 *' : 'Name *'}</label>
              <Input name="name" defaultValue={location.name} required className="mt-1" />
            </div>
            <div>
              <label className="text-[11px] text-[#4f7a5c]">{isZh ? '地址' : 'Address'}</label>
              <Input name="address" defaultValue={location.address || ''} className="mt-1" />
            </div>
            <div>
              <label className="text-[11px] text-[#4f7a5c]">{isZh ? '状态' : 'Status'}</label>
              <select
                name="is_active"
                defaultValue={String(location.is_active)}
                className="mt-1 w-full rounded-[10px] border px-3 py-2 text-[13px]"
              >
                <option value="true">{isZh ? '启用' : 'Active'}</option>
                <option value="false">{isZh ? '停用' : 'Inactive'}</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (isZh ? '保存中…' : 'Saving…') : isZh ? '保存' : 'Save'}
              </Button>
              <Link href="/locations">
                <Button variant="ghost" type="button">
                  {isZh ? '返回' : 'Back'}
                </Button>
              </Link>
              <Button variant="ghost" type="button" onClick={handleDelete} className="ml-auto text-red-600">
                {isZh ? '删除' : 'Delete'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
