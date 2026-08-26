'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const Shell = ({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) => (
    <div className="min-h-screen w-full flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex flex-1 bg-[#0f3d2e] relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#1a5c46] blur-[80px] opacity-60" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[70%] h-[70%] rounded-full bg-[#d26a39] blur-[100px] opacity-30" />
          <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#4f7a5c] blur-[60px] opacity-40" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-white/10 flex items-center justify-center backdrop-blur">
                <span className="h-6 w-6 rounded-full bg-white/20 block" />
              </div>
              <span className="font-serif text-[20px] text-white tracking-tight">{isZh ? '活水书房' : 'COCM Bookshop'}</span>
            </div>
          </div>
          <div className="space-y-6">
            <h1 className="font-serif text-[42px] leading-[1.1] text-white">
              {isZh ? '管理你的' : 'Manage your'}
              <br />
              <span className="text-[#f4d7c4]">{isZh ? '书店库存' : 'bookstore'}</span>
              <br />
              {isZh ? '井井有条' : 'with ease'}
            </h1>
            <p className="text-[15px] leading-relaxed text-white/60 max-w-[360px]">
              {isZh
                ? '采购、库存、销售、报表，一站式管理。支持中英文，双语显示。'
                : 'Purchasing, inventory, sales, and reports — all in one place. Bilingual support.'}
            </p>
            <div className="flex gap-3 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0f3d2e] bg-white/20 backdrop-blur flex items-center justify-center text-[11px] text-white">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-white/50 pt-1.5">{isZh ? '已有 100+ 本图书在管' : '100+ books managed'}</p>
            </div>
          </div>
          <div className="text-[11px] text-white/30">
            © {new Date().getFullYear()} {isZh ? '活水书房 · COCM Bookshop' : 'COCM Bookshop'}
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#faf6ee]">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-[12px] bg-[#0f3d2e] flex items-center justify-center">
              <span className="h-5 w-5 rounded-full bg-[#0f3d2e]/20 block" />
            </div>
            <span className="font-serif text-[18px] text-[#0f3d2e]">{isZh ? '活水书房' : 'COCM Bookshop'}</span>
          </div>

          <div className="mb-8">
            <h2 className="font-serif text-[28px] tracking-tight text-[#0f3d2e]">{title}</h2>
            {subtitle && <p className="mt-2 text-[13px] text-[#4f7a5c]">{subtitle}</p>}
          </div>

          {children}

          <div className="mt-8 text-center text-[11px] text-[#4f7a5c]/60">
            {isZh ? '安全登录 · 数据加密' : 'Secure login · Encrypted data'}
          </div>
        </div>
      </div>
    </div>
  );

  if (isReset && resetAction) {
    return (
      <Shell title={isZh ? '重置密码' : 'Reset Password'} subtitle={isZh ? '输入邮箱，我们会发送重置链接' : 'Enter your email, we will send a reset link'}>
        {error && <div className="mb-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{getErrorText(error)}</div>}
        {message && <div className="mb-4 rounded-[12px] bg-green-50 px-3 py-2 text-[12px] text-green-700">{message}</div>}
        <form action={resetAction} className="space-y-3">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Input name="email" placeholder={isZh ? '邮箱' : 'Email'} type="email" required className="h-11" />
          <Button type="submit" className="w-full h-11 rounded-[12px] bg-[#0f3d2e] hover:bg-[#1a5c46] text-white">
            {isZh ? '发送重置邮件' : 'Send Reset Email'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <a href={`/auth?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[12px] text-[#4f7a5c] hover:text-[#0f3d2e] underline">
            {isZh ? '返回登录' : 'Back to Login'}
          </a>
        </div>
      </Shell>
    );
  }

  if (isAdminReset && adminResetAction) {
    return (
      <Shell title={isZh ? '管理员重置' : 'Admin Reset'} subtitle={isZh ? '知道邮箱但忘了密码？管理员可以直接设置新密码' : 'Know the email but forgot password? Admin can set a new password directly'}>
        {error && <div className="mb-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{getErrorText(error)}</div>}
        {message && <div className="mb-4 rounded-[12px] bg-green-50 px-3 py-2 text-[12px] text-green-700">{message}</div>}
        <form action={adminResetAction} className="space-y-3">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Input name="email" placeholder={isZh ? '要重置的邮箱' : 'Email to reset'} type="email" required className="h-11" />
          <Input name="newPassword" placeholder={isZh ? '新密码（至少6位）' : 'New password (min 6 chars)'} type="password" required className="h-11" />
          <Button type="submit" className="w-full h-11 rounded-[12px] bg-[#0f3d2e] hover:bg-[#1a5c46] text-white">
            {isZh ? '直接重置密码' : 'Reset Password Directly'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <a href={`/auth?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[12px] text-[#4f7a5c] hover:text-[#0f3d2e] underline">
            {isZh ? '返回登录' : 'Back to Login'}
          </a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title={isSignUp ? (isZh ? '创建账号' : 'Create account') : isZh ? '欢迎回来' : 'Welcome back'}
      subtitle={isSignUp ? (isZh ? '创建你的书店管理账号' : 'Create your bookstore account') : isZh ? '登录你的书店管理系统' : 'Sign in to your bookstore system'}
    >
      {error && <div className="mb-4 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{getErrorText(error)}</div>}
      {message && (
        <div className="mb-4 rounded-[12px] bg-green-50 px-3 py-2 text-[12px] text-green-700">
          {message === '账号创建成功，请去邮箱确认或直接登录' || message.includes('Account created') ? tt('auth.success') : message}
        </div>
      )}

      <form action={isSignUp ? signUpAction : signInAction} className="space-y-3">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        {isSignUp && <Input name="displayName" placeholder={tt('auth.displayNamePlaceholder')} type="text" required className="h-11" />}
        <Input name="email" placeholder={tt('auth.email')} type="email" required className="h-11" />
        <Input name="password" placeholder={tt('auth.password')} type="password" required className="h-11" />
        {isSignUp && <Input name="confirmPassword" placeholder={tt('auth.confirmPassword')} type="password" required className="h-11" />}
        <Button type="submit" className="w-full h-11 rounded-[12px] bg-[#0f3d2e] hover:bg-[#1a5c46] text-white font-semibold">
          {isSignUp ? tt('auth.signUp') : tt('auth.login')}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-center">
        {isSignUp ? (
          <a href={`/auth?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[12px] text-[#4f7a5c] hover:text-[#0f3d2e] underline">
            {tt('auth.hasAccount')}
          </a>
        ) : (
          <>
            <a href={`/auth?mode=signup&redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[13px] font-medium text-[#0f3d2e] hover:underline">
              {tt('auth.noAccount')}
            </a>
            <div className="flex items-center justify-center gap-3 pt-2">
              <a href={`/auth?mode=reset&redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[11px] text-[#4f7a5c]/70 hover:text-[#0f3d2e] underline">
                {isZh ? '忘记密码？' : 'Forgot password?'}
              </a>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
