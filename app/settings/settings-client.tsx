'use client';

import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { updateProfile } from './actions';
import { useT } from '@/lib/i18n/use-t';

const iconOptions = [
  { value: '活', label: '活' },
  { value: '书', label: '书' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: '★', label: '★' },
  { value: '✦', label: '✦' },
  { value: '●', label: '●' },
];

const colorOptions = [
  { value: '#d26a39', label: 'Ember 橙', bg: '#d26a39' },
  { value: '#0f3d2e', label: 'Forest 绿', bg: '#0f3d2e' },
  { value: '#4f7a5c', label: 'Moss 绿', bg: '#4f7a5c' },
  { value: '#f4e8c1', label: 'Sand 米', bg: '#f4e8c1' },
  { value: '#d9edf6', label: 'Sky 蓝', bg: '#d9edf6' },
  { value: '#8b5cf6', label: 'Purple 紫', bg: '#8b5cf6' },
  { value: '#ec4899', label: 'Pink 粉', bg: '#ec4899' },
  { value: '#0ea5e9', label: 'Blue 蓝', bg: '#0ea5e9' },
];

type Props = {
  profile: any;
  user: any;
  role: string | null;
};

export function SettingsClient({ profile, user, role }: Props) {
  const { tt, lang } = useT();
  const isZh = lang === 'zh';
  const currentName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
  const currentIcon = user?.user_metadata?.avatar_icon || '活';
  const currentColor = user?.user_metadata?.avatar_color || '#d26a39';

  const [displayName, setDisplayName] = useState(currentName);
  const [avatarIcon, setAvatarIcon] = useState(currentIcon);
  const [avatarColor, setAvatarColor] = useState(currentColor);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const fd = new FormData();
    fd.set('displayName', displayName);
    fd.set('avatarIcon', avatarIcon);
    fd.set('avatarColor', avatarColor);
    try {
      await updateProfile(fd);
      setMessage(isZh ? '已保存' : 'Saved');
      // Force reload to update sidebar
      setTimeout(() => window.location.reload(), 600);
    } catch (err: any) {
      setMessage(err.message || (isZh ? '保存失败' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleNameSave = async () => {
    if (!displayName.trim()) {
      setMessage(isZh ? '名字不能为空' : 'Name cannot be empty');
      return;
    }
    setSaving(true);
    setMessage('');
    const fd = new FormData();
    fd.set('displayName', displayName.trim());
    fd.set('avatarIcon', avatarIcon);
    fd.set('avatarColor', avatarColor);
    try {
      await updateProfile(fd);
      setMessage(isZh ? `名字已改成 ${displayName.trim()}` : `Name changed to ${displayName.trim()}`);
      setTimeout(() => window.location.reload(), 600);
    } catch (err: any) {
      setMessage(err.message || (isZh ? '保存失败' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Settings" titleZh="个人设置" eyebrow={user?.email || '活水书房'}>
      <div className="mx-auto max-w-[720px] space-y-6">
        <Card>
          <CardTitle>{isZh ? '个人资料' : 'Profile'}</CardTitle>
          <p className="mt-2 text-[13px] text-[#0f3d2e]/60">{isZh ? '改自己的名字和头像，会在侧边栏和系统里显示' : 'Update your name and avatar, shown in sidebar and system'}</p>

          {message && (
            <div className={`mt-4 rounded-[12px] px-3 py-2 text-[12px] ${message.includes('失败') || message.includes('不能为空') || message.toLowerCase().includes('fail') || message.toLowerCase().includes('empty') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {message}
            </div>
          )}

          <div className="mt-4 rounded-[12px] bg-[#faf6ee] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4f7a5c]">{isZh ? '当前账号' : 'Current Account'}</p>
            <p className="mt-1 text-[13px] font-mono">{user?.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-[#4f7a5c]">{isZh ? '角色' : 'Role'}</span>
              <Badge variant={role === 'super_admin' ? 'danger' : role === 'admin' ? 'active' : 'default'}>{role || (isZh ? '无角色' : 'No role')}</Badge>
              {role === 'super_admin' && <span className="text-[11px] text-[#4f7a5c]">{isZh ? '可管理所有人员' : 'Can manage all staff'}</span>}
              {role === 'admin' && <span className="text-[11px] text-[#4f7a5c]">{isZh ? '可查看人员和记录' : 'Can view staff and records'}</span>}
              {role === 'staff' && <span className="text-[11px] text-[#4f7a5c]">{isZh ? '日常操作' : 'Daily operations'}</span>}
            </div>

            <div className="mt-4 flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-[#4f7a5c]">{isZh ? '我的名字 *' : 'My Name *'}</label>
                <div className="mt-1 flex gap-2">
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="张牧师" className="flex-1" />
                  <Button size="sm" onClick={handleNameSave} disabled={saving} className="shrink-0">{saving ? (isZh ? '保存…' : 'Saving...') : (isZh ? '改名' : 'Rename')}</Button>
                </div>
                <p className="mt-1 text-[11px] text-[#4f7a5c]">{isZh ? '改完点“改名”，侧边栏会同步更新' : 'Click Rename, sidebar will update'}</p>
              </div>
            </div>

          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.2fr]">
            <div className="rounded-[16px] border border-[#0f3d2e]/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4f7a5c]">{isZh ? '预览' : 'Preview'}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[14px] font-bold text-white" style={{ backgroundColor: avatarColor }}>
                  {avatarIcon}
                </div>
                <div>
                  <p className="text-[13px] font-semibold">{displayName || (isZh ? '未命名' : 'Unnamed')}</p>
                  <p className="text-[11px] text-[#4f7a5c] flex items-center gap-1"><Badge variant={role === 'super_admin' ? 'danger' : 'default'}>{role || '—'}</Badge> {user?.email?.split('@')[0]}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[#4f7a5c]">{isZh ? '显示名称（同上）' : 'Display Name (same as above)'}</label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="张牧师" className="mt-1" />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#4f7a5c]">{isZh ? '图标 (1-2 字符)' : 'Icon (1-2 chars)'}</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {iconOptions.map((o) => (
                    <button key={o.value} type="button" onClick={() => setAvatarIcon(o.value)} className={`h-8 w-8 rounded-[8px] text-[13px] font-bold transition ${avatarIcon === o.value ? 'bg-[#0f3d2e] text-white' : 'bg-[#faf6ee] text-[#0f3d2e] hover:bg-[#0f3d2e]/10'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <Input value={avatarIcon} onChange={(e) => setAvatarIcon(e.target.value.slice(0,2))} maxLength={2} className="mt-2 w-20 text-center" />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#4f7a5c]">{isZh ? '颜色' : 'Color'}</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {colorOptions.map((c) => (
                    <button key={c.value} type="button" onClick={() => setAvatarColor(c.value)} className={`h-7 w-7 rounded-full border-2 transition ${avatarColor === c.value ? 'border-[#0f3d2e] scale-110' : 'border-white shadow-sm'}`} style={{ backgroundColor: c.bg }} title={c.label} />
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={saving} className="w-full">{saving ? (isZh ? '保存中…' : 'Saving...') : (isZh ? '保存全部' : 'Save All')}</Button>
            </form>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
