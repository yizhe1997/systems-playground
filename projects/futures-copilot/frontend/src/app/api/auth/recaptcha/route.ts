import { NextResponse } from 'next/server';
import { fetchInternalBackend } from '@/lib/server/internal-api';

const AUTH_RECAPTCHA_COOKIE = 'fc_auth_recaptcha_ok';

type AuthAction = 'sign_in' | 'sign_up';

interface AuthRecaptchaRequest {
  recaptchaToken?: string;
  action?: string;
}

function normalizeAction(action: string): AuthAction | null {
  const normalized = action.trim().toLowerCase();
  if (normalized === 'sign_in' || normalized === 'sign_up') {
    return normalized;
  }
  return null;
}

export async function POST(request: Request) {
  let body: AuthRecaptchaRequest;
  try {
    body = (await request.json()) as AuthRecaptchaRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const recaptchaToken = (body.recaptchaToken || '').trim();
  const action = normalizeAction(body.action || '');

  if (!recaptchaToken) {
    return NextResponse.json({ error: 'reCAPTCHA token is required.' }, { status: 400 });
  }

  if (!action) {
    return NextResponse.json({ error: 'Invalid reCAPTCHA action.' }, { status: 400 });
  }

  const backendRes = await fetchInternalBackend('/auth/recaptcha/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recaptchaToken, action }),
  });

  if (!backendRes.ok) {
    const data: { error?: string } = await backendRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: data.error || 'Security verification failed.' },
      { status: backendRes.status },
    );
  }

  const response = NextResponse.json({ status: 'ok' });
  response.cookies.set({
    name: AUTH_RECAPTCHA_COOKIE,
    value: '1',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 120,
  });

  return response;
}
