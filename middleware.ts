import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 受保护路径 - 需要登录才能访问，像 COCM 之前那样
const protectedPrefixes = [
  '/',
  '/books',
  '/suppliers',
  '/locations',
  '/purchase-orders',
  '/reports',
  '/sales',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径 - 不需要认证
  const isPublicPath = 
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.');

  if (isPublicPath) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 如果 env 缺失，跳过认证（防止 Vercel 500）
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as any)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = protectedPrefixes.some((prefix) => {
    if (prefix === '/') {
      return pathname === '/' || protectedPrefixes.slice(1).some(p => pathname.startsWith(p));
    }
    return pathname.startsWith(prefix);
  });

  // 如果访问受保护路径但没登录，跳到 /auth
  if (isProtected && !user && pathname !== '/auth') {
    const signInUrl = new URL('/auth', request.url);
    signInUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
