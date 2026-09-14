'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const VALID_TYPES: EmailOtpType[] = [
  'signup',
  'magiclink',
  'recovery',
  'invite',
  'email_change',
  'email',
];

// Verifies Supabase email links (token-hash flow) on the client.
// The emailed link is self-contained (implicit flow, no PKCE verifier), so it
// works even when clicked on a different device/browser than the one that
// requested it. Handles both ?token_hash=&type= and #access_token fragments.
export default function AuthConfirmPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let done = false;
    const succeed = () => {
      if (!done) {
        done = true;
        window.history.replaceState({}, document.title, '/auth/confirm');
        router.replace('/auth/reset');
      }
    };
    const fail = () => {
      if (!done) {
        done = true;
        setFailed(true);
      }
    };

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      fail();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get('token_hash') ?? params.get('token');
    const type = params.get('type') as EmailOtpType | null;

    if (token_hash && type && VALID_TYPES.includes(type)) {
      supabase.auth.verifyOtp({ token_hash, type }).then(({ error }) => {
        if (error) {
          fail();
        } else {
          succeed();
        }
      });
      return;
    }

    // Fragment flow: the browser client auto-detects the session
    // (detectSessionInUrl).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        succeed();
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        succeed();
      }
    });
    const timer = setTimeout(fail, 8000);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f0] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        {failed ? (
          <>
            <h1 className="text-xl font-semibold text-gray-900">链接无效或已过期</h1>
            <p className="mt-3 text-sm text-gray-500">请重新申请一封重置邮件。</p>
            <Link
              href="/auth?mode=reset"
              className="mt-6 inline-block font-semibold text-[#e5444c] underline underline-offset-2"
            >
              重新申请
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900">正在验证链接…</h1>
            <p className="mt-3 text-sm text-gray-500">一般只需要几秒钟。</p>
          </>
        )}
      </div>
    </main>
  );
}
