'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/app-shell';
import { useT } from '@/lib/i18n/use-t';

type Props = {
  isSignUp: boolean;
  isReset?: boolean;
  isAdminReset?: boolean;
  error?: string;
  message?: string;
  redirectTo: string;
  signInAction: (fd: FormData) => void;
  signUpAction: (fd: FormData) => void;
  resetAction?: (fd: FormData) => void;
  adminResetAction?: (fd: FormData) => void;
};

export function AuthClient({
  isSignUp,
  isReset,
  isAdminReset,
  error,
  message,
  redirectTo,
  signInAction,
  signUpAction,
  resetAction,
  adminResetAction,
}: Props) {
  const { tt, lang, isZh } = useT();

  const getErrorText = (err: string) => {
    if (err === 'missing') return tt('auth.missing');
    if (err === 'no-supabase') return tt('auth.noSupabase');
    if (err.includes('Passwords') || err.includes('不一致')) return tt('auth.passwordMismatch');
    if (err.includes('6') && err.toLowerCase().includes('password')) return tt('auth.passwordMin');
    return tt('auth.fail', { msg: err });
  };

  if (isReset && resetAction) {
    return (
      <AppShell title={isZh ? '重置密码' : 'Reset Password'} titleZh="重置密码" eyebrow="活水书房">
        <div className="mx-auto max-w-[480px]">
          <Card>
            <CardTitle>{isZh ? '重置密码' : 'Reset Password'}</CardTitle>
            <p className="mt-2 text-[13px] text-[#0f3d2e]/70">
              {isZh ? '输入邮箱，我们会发送重置链接' : 'Enter your email, we will send a reset link'}
            </p>

            {error && (
              <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{getErrorText(error)}</div>
            )}
            {message && (
              <div className="mt-4 rounded-[12px] bg-green-50 px-3 py-2 text-[12px] text-green-700">{message}</div>
            )}

            <form action={resetAction} className="mt-6 space-y-3">
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <Input name="email" placeholder={isZh ? '邮箱' : 'Email'} type="email" required />
              <Button type="submit" className="w-full">
                {isZh ? '发送重置邮件' : 'Send Reset Email'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <a href={`/auth?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[12px] text-[#4f7a5c] underline">
                {isZh ? '返回登录' : 'Back to Login'}
              </a>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (isAdminReset && adminResetAction) {
    return (
      <AppShell
        title={isZh ? '管理员重置' : 'Admin Reset'}
        titleZh="管理员重置密码"
        eyebrow="活水书房"
      >
        <div className="mx-auto max-w-[480px]">
          <Card>
            <CardTitle>{isZh ? '管理员直接重置密码' : 'Admin Direct Password Reset'}</CardTitle>
            <p className="mt-2 text-[13px] text-[#0f3d2e]/70">
              {isZh
                ? '知道邮箱但忘了密码？管理员可以直接设置新密码'
                : 'Know the email but forgot password? Admin can set a new password directly'}
            </p>

            {error && (
              <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{getErrorText(error)}</div>
            )}
            {message && (
              <div className="mt-4 rounded-[12px] bg-green-50 px-3 py-2 text-[12px] text-green-700">{message}</div>
            )}

            <form action={adminResetAction} className="mt-6 space-y-3">
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <Input name="email" placeholder={isZh ? '要重置的邮箱' : 'Email to reset'} type="email" required />
              <Input
                name="newPassword"
                placeholder={isZh ? '新密码（至少6位）' : 'New password (min 6 chars)'}
                type="password"
                required
              />
              <Button type="submit" className="w-full">
                {isZh ? '直接重置密码' : 'Reset Password Directly'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <a href={`/auth?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[12px] text-[#4f7a5c] underline">
                {isZh ? '返回登录' : 'Back to Login'}
              </a>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={isSignUp ? tt('auth.titleSignUp') : tt('auth.titleSignIn')}
      titleZh={isSignUp ? tt('auth.titleSignUp') : tt('auth.titleSignIn')}
      eyebrow="活水书房"
    >
      <div className="mx-auto max-w-[480px]">
        <Card>
          <CardTitle>{isSignUp ? tt('auth.signUpTitle') : tt('auth.loginTitle')}</CardTitle>

          {error && (
            <div className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{getErrorText(error)}</div>
          )}
          {message && (
            <div className="mt-4 rounded-[12px] bg-green-50 px-3 py-2 text-[12px] text-green-700">
              {message === '账号创建成功，请去邮箱确认或直接登录' || message.includes('Account created')
                ? tt('auth.success')
                : message}
            </div>
          )}

          <form action={isSignUp ? signUpAction : signInAction} className="mt-6 space-y-3">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            {isSignUp && <Input name="displayName" placeholder={tt('auth.displayNamePlaceholder')} type="text" required />}
            <Input name="email" placeholder={tt('auth.email')} type="email" required />
            <Input name="password" placeholder={tt('auth.password')} type="password" required />
            {isSignUp && <Input name="confirmPassword" placeholder={tt('auth.confirmPassword')} type="password" required />}
            <Button type="submit" className="w-full">
              {isSignUp ? tt('auth.signUp') : tt('auth.login')}
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-2 text-center">
            {isSignUp ? (
              <a href={`/auth?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[12px] text-[#4f7a5c] underline">
                {tt('auth.hasAccount')}
              </a>
            ) : (
              <>
                <a
                  href={`/auth?mode=signup&redirectTo=${encodeURIComponent(redirectTo)}`}
                  className="text-[12px] text-[#4f7a5c] underline"
                >
                  {tt('auth.noAccount')}
                </a>
                <a
                  href={`/auth?mode=reset&redirectTo=${encodeURIComponent(redirectTo)}`}
                  className="text-[12px] text-[#4f7a5c]/70 underline"
                >
                  {isZh ? '忘记密码？' : 'Forgot password?'}
                </a>
                <a
                  href={`/auth?mode=admin-reset&redirectTo=${encodeURIComponent(redirectTo)}`}
                  className="text-[11px] text-[#4f7a5c]/50 underline"
                >
                  {isZh ? '管理员直接重置密码' : 'Admin direct password reset'}
                </a>
              </>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
