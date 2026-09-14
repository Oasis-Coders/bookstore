import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import { updatePassword } from '../actions';

type Props = {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
};

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return { url, anonKey };
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? '/';
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getEnv();

  let hasSession = false;
  if (supabaseUrl && supabaseAnonKey) {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    hasSession = !!user;
  }

  // No session (e.g. link expired or opened without verifying) — the
  // password update would fail, so ask for a fresh link instead.
  if (!hasSession) {
    return (
      <main className="brand-wash-bg flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-semibold text-gray-900">链接无效或已过期</h1>
          <p className="mt-3 text-sm text-gray-500">请重新申请一封重置邮件。</p>
          <Link
            href="/auth?mode=reset"
            className="mt-6 inline-block font-semibold text-cocm-red underline underline-offset-2"
          >
            重新申请
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cocm-paper px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-xl font-semibold text-gray-900">设置新密码</h1>
        <p className="mt-2 text-sm text-gray-500">请输入你的新密码，至少 6 位字符。</p>

        {params.error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            {params.error}
          </div>
        ) : null}

        <form action={updatePassword} className="mt-6 space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              新密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-cocm-ink focus:ring-2 focus:ring-cocm-ink/20"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              确认新密码
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-cocm-ink focus:ring-2 focus:ring-cocm-ink/20"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-cocm-red px-6 py-3 font-semibold text-white transition hover:bg-[#c9333b]"
          >
            设置新密码
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          链接无效或已过期？{' '}
          <Link href="/auth?mode=reset" className="font-semibold text-cocm-red underline underline-offset-2">
            重新申请
          </Link>
        </p>
      </div>
    </main>
  );
}
