'use client';

import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
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
};

export function SettingsClient({ profile, user }: Props) {
  const { tt } = useT();
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
      setMessage('已保存');
    } catch (err: any) {
      setMessage(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Settings" titleZh="个人设置" eyebrow={user?.email || '活水书房'}>
      <div className="mx-auto max-w-[720px] space-y-6">
        <Card>
          <CardTitle>个人资料</CardTitle>
          <p className="mt-2 text-[13px] text-[#0f3d2e]/60">配置你的头像图标和显示名称，会在侧边栏和系统里显示</p>

          {message && (
            <div className={`mt-4 rounded-[12px] px-3 py-2 text-[12px] ${message.includes('失败') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Preview */}
            <div className="flex items-center gap-4 rounded-[16px] bg-[#faf6ee] p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] text-[18px] font-bold text-white" style={{ backgroundColor: avatarColor }}>
                {avatarIcon}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#0f3d2e]">{displayName || '未命名'}</p>
                <p className="text-[12px] text-[#4f7a5c]">{user?.email || ''}</p>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">显示名称</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="你的名字" className="mt-1" required />
              <p className="mt-1 text-[11px] text-[#4f7a5c]/70">会在系统各处显示，支持中文</p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">头像图标</label>
              <p className="mt-1 text-[11px] text-[#4f7a5c]/70">选一个字符作为你的头像，1个字最佳</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {iconOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAvatarIcon(opt.value)}
                    className={`flex h-10 w-10 items-center justify-center rounded-[10px] border text-[14px] font-bold transition-all ${avatarIcon === opt.value ? 'border-[#0f3d2e] bg-[#0f3d2e] text-white shadow-sm' : 'border-[#0f3d2e]/10 bg-white text-[#0f3d2e] hover:border-[#0f3d2e]/20'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Input value={avatarIcon} onChange={(e) => setAvatarIcon(e.target.value.slice(0, 2))} placeholder="自定义 1-2 个字" className="mt-2 max-w-[160px]" maxLength={2} />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#0f3d2e]">头像颜色</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {colorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAvatarColor(opt.value)}
                    className={`h-9 w-9 rounded-full border-2 transition-all ${avatarColor === opt.value ? 'border-[#0f3d2e] ring-2 ring-[#0f3d2e]/20' : 'border-white shadow-sm'}`}
                    style={{ backgroundColor: opt.bg }}
                    title={opt.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="min-w-[120px]">{saving ? '保存中…' : '保存设置'}</Button>
              <Button type="button" variant="ghost" onClick={() => { setDisplayName(currentName); setAvatarIcon(currentIcon); setAvatarColor(currentColor); setMessage(''); }}>重置</Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardTitle>账号信息</CardTitle>
          <div className="mt-4 space-y-2 text-[13px]">
            <div className="flex justify-between rounded-[12px] bg-[#faf6ee] px-3 py-2">
              <span className="text-[#4f7a5c]">邮箱</span>
              <span className="font-medium text-[#0f3d2e]">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between rounded-[12px] bg-[#faf6ee] px-3 py-2">
              <span className="text-[#4f7a5c]">用户 ID</span>
              <span className="font-mono text-[11px] text-[#0f3d2e]">{user?.id?.slice(0, 8) || '—'}…</span>
            </div>
            <div className="flex justify-between rounded-[12px] bg-[#faf6ee] px-3 py-2">
              <span className="text-[#4f7a5c]">注册时间</span>
              <span className="text-[#0f3d2e]">{user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '—'}</span>
            </div>
          </div>
        </Card>

        <div className="rounded-[16px] bg-[#f4e8c1]/50 p-4 text-[12px] text-[#0f3d2e]/70">
          <p>小提示：改完名字和头像后，刷新一下侧边栏就会看到新图标。</p>
        </div>
      </div>
    </AppShell>
  );
}
