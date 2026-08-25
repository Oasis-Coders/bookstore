import { AppShell } from '@/components/layout/app-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn, signUp } from './actions';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ redirectTo?: string; error?: string; mode?: string; message?: string }>;
};

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return { url, anonKey };
}

export default async function AuthPage({ searchParams }: Props) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? '/';
  const error = params.error;
  const mode = params.mode ?? 'signin';
  const message = params.message;

  // Check if already logged in
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getEnv();
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

  const isSignUp = mode === 'signup';

  return (
    <AppShell title="Auth" titleZh={isSignUp ? "注册" : "登录"} eyebrow="活水书室">
      <div className="mx-auto max-w-[480px]">
        <Card>
          <CardTitle>{isSignUp ? '创建账号' : '登录书店系统'}</CardTitle>

          {error && (
            <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {error === 'missing' ? '请输入邮箱和密码' : error === 'no-supabase' ? 'Supabase 未配置' : `失败: ${error}`}
            </div>
          )}
          {message && (
            <div className="mt-4 rounded-[12px] bg-green-50 px-3 py-2 text-[12px] text-green-700">
              {message}
            </div>
          )}

          <form action={isSignUp ? signUp : signIn} className="mt-6 space-y-3">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Input name="email" placeholder="邮箱" type="email" required />
            <Input name="password" placeholder="密码" type="password" required />
            {isSignUp && <Input name="confirmPassword" placeholder="确认密码" type="password" required />}
            <Button type="submit" className="w-full">{isSignUp ? '注册' : '登录'}</Button>
          </form>

          <div className="mt-4 text-center">
            {isSignUp ? (
              <a href={`/auth?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[12px] text-[#4f7a5c] underline">
                已有账号？去登录
              </a>
            ) : (
              <a href={`/auth?mode=signup&redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[12px] text-[#4f7a5c] underline">
                没有账号？创建账号
              </a>
            )}
          </div>

          <p className="mt-6 text-center text-[11px] text-[#4f7a5c]">
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
