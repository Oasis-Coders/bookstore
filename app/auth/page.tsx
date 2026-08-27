import { AuthClient } from './auth-client';
import { signIn, signUp, resetPassword } from './actions';
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

  // Check if already logged in (except for reset flow)
  if (mode !== 'reset') {
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
  }

  const isSignUp = mode === 'signup';
  const isReset = mode === 'reset';

  return (
    <AuthClient
      isSignUp={isSignUp}
      isReset={isReset}
      error={error}
      message={message}
      redirectTo={redirectTo}
      signInAction={signIn}
      signUpAction={signUp}
      resetAction={resetPassword}
    />
  );
}
