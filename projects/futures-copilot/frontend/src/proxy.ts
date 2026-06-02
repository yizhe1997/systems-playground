import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const AUTH_RECAPTCHA_COOKIE = 'fc_auth_recaptcha_ok';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/api/auth/signin/google') {
    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!recaptchaSiteKey) {
      return NextResponse.next();
    }

    const hasPreflightCookie = request.cookies.get(AUTH_RECAPTCHA_COOKIE)?.value === '1';
    if (!hasPreflightCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('authError', 'recaptcha_required');
      return NextResponse.redirect(url);
    }

    const response = NextResponse.next();
    response.cookies.set({
      name: AUTH_RECAPTCHA_COOKIE,
      value: '',
      path: '/',
      maxAge: 0,
    });

    return response;
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/auth/signin/google'],
};
