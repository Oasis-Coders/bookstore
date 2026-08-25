'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
import { useT } from '@/lib/i18n/use-t';

type Props = {
  isSignUp: boolean;
  error?: string;
  message?: string;
  redirectTo: string;
  signInAction: (fd: FormData) => void;
  signUpAction: (fd: FormData) => void;
};

export function AuthClient({ isSignUp, error, message, redirectTo, signInAction, signUpAction }: Props) {
  const { tt } = useT();

  const getErrorText = (err: string) => {
    if (err === 'missing') return tt('auth.missing');
    if (err === 'no-supabase') return tt('auth.noSupabase');
    if (err.includes('Passwords') || err.includes('不一致')) return tt('auth.passwordMismatch');
    if (err.includes('6') && err.toLowerCase().includes('password')) return tt('auth.passwordMin');
    return tt('auth.fail', { msg: err });
  };

  return (
    <AppShell title={isSignUp ? tt('auth.titleSignUp') : tt('auth.titleSignIn')} titleZh={isSignUp ? tt('auth.titleSignUp') : tt('auth.titleSignIn')} eyebrow="活水书室">
      <div className="mx-auto max-w-[480px]">
        <Card>
          <CardTitle>{isSignUp ? tt('auth.signUpTitle') : tt('auth.loginTitle')}</CardTitle>

          {error && (
            <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {getErrorText(error)}
            </div>
          )}
          {message && (
            <div className="mt-4 rounded-[12px] bg-green-50 px-3 py-2 text-[12px] text-green-700">
              {message === '账号创建成功，请去邮箱确认或直接登录' || message.includes('Account created') ? tt('auth.success') : message}
            </div>
          )}

          <form action={isSignUp ? signUpAction : signInAction} className="mt-6 space-y-3">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            {isSignUp && <Input name="displayName" placeholder={tt('auth.displayNamePlaceholder')} type="text" required />}
            <Input name="email" placeholder={tt('auth.email')} type="email" required />
            <Input name="password" placeholder={tt('auth.password')} type="password" required />
            {isSignUp && <Input name="confirmPassword" placeholder={tt('auth.confirmPassword')} type="password" required />}
            <Button type="submit" className="w-full">{isSignUp ? tt('auth.signUp') : tt('auth.login')}</Button>
          </form>

          <div className="mt-4 text-center">
            {isSignUp ? (
              <a href={`/auth?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[12px] text-[#4f7a5c] underline">
                {tt('auth.hasAccount')}
              </a>
            ) : (
              <a href={`/auth?mode=signup&redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[12px] text-[#4f7a5c] underline">
                {tt('auth.noAccount')}
              </a>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
