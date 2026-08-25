import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn, signOut } from './actions';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
};

export default async function AuthPage({ searchParams }: Props) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? '/';
  const error = params.error;

  // Check if already logged in
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseAnonKey) {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      redirect(redirectTo);
    }
  }

  return (
    <AppShell title="Auth" titleZh="登录" eyebrow="活水书室">
      <div className="mx-auto max-w-[480px]">
        <Card>
          <CardTitle>登录书店系统</CardTitle>
          <p className="mt-2 text-[13px] text-[#0f3d2e]/70">
            像 COCM 之前那样，需要登录才能访问库存和采购
          </p>

          {error && (
            <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {error === 'missing' ? '请输入邮箱和密码' : error === 'no-supabase' ? 'Supabase 未配置' : `登录失败: ${error}`}
            </div>
          )}

          <form action={signIn} className="mt-6 space-y-3">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Input name="email" placeholder="邮箱" type="email" required />
            <Input name="password" placeholder="密码" type="password" required />
            <Button type="submit" className="w-full">登录</Button>
          </form>

          <div className="mt-6 rounded-[12px] bg-[#f9e0d0]/40 p-3 text-[12px] text-[#0f3d2e]/80">
            <p className="font-semibold">邀请链接跳 localhost 修复：</p>
            <p className="mt-1">1. Supabase Dashboard → Authentication → URL Configuration</p>
            <p>2. Site URL 改成你的 Vercel 域名</p>
            <p>3. Additional Redirects 加 localhost 和你的域名</p>
            <p className="mt-1">4. 重发邀请</p>
          </div>

          <form action={signOut} className="mt-4">
            <Button variant="ghost" className="w-full text-[12px]">清除登录</Button>
          </form>

          <p className="mt-4 text-center text-[11px] text-[#4f7a5c]">
            首位 super_admin 需手动插入：<br />
            <code className="mt-1 block rounded bg-[#faf6ee] p-2 text-left text-[10px]">
              insert into user_roles(user_id, role_id) select '&lt;UUID&gt;'::uuid, id from roles where name='super_admin';
            </code>
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
