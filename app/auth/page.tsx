import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AuthPage() {
  return (
    <AppShell title="Auth" titleZh="登录" eyebrow="Supabase Auth">
      <div className="mx-auto max-w-[480px]">
        <Card>
          <CardTitle>登录 / 邀请说明</CardTitle>
          <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-[#0f3d2e]/80">
            <p>
              系统使用 Supabase Auth。管理员在 Supabase Dashboard → Authentication → Users → Invite user 输入邮箱邀请。
            </p>
            <div className="rounded-[12px] bg-[#f9e0d0]/40 p-3 text-[12px]">
              <p className="font-semibold">邀请链接跳 localhost 修复：</p>
              <p className="mt-1">1. Dashboard → Authentication → URL Configuration</p>
              <p>2. Site URL 改成你的 Vercel 域名，例如 https://huoshui-bookstore.vercel.app</p>
              <p>3. Additional Redirect URLs 加：</p>
              <p className="font-mono text-[11px]">http://localhost:3000/* 和 https://你的域名/*</p>
              <p className="mt-1">4. 重发邀请（旧 token 已绑定旧 URL）</p>
            </div>
            <p>
              临时方案：本地跑 <code className="rounded bg-[#faf6ee] px-1">pnpm dev</code> 让 localhost:3000 跑起来，再点邀请链接。
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Input placeholder="邮箱" type="email" />
            <Input placeholder="密码" type="password" />
            <Button className="w-full">登录</Button>
            <Button variant="ghost" className="w-full">忘记密码</Button>
          </div>

          <p className="mt-4 text-center text-[11px] text-[#4f7a5c]">
            首位 super_admin 需手动插入：<br />
            <code className="mt-1 block rounded bg-[#faf6ee] p-2 text-left text-[10px]">
              insert into user_roles(user_id, role_id) select '&lt;你的Auth UUID&gt;'::uuid, id from roles where name='super_admin';
            </code>
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
