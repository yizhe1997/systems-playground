import { Session } from 'next-auth';

const BACKEND_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088/api';
const INTERNAL_API_SHARED_SECRET = process.env.INTERNAL_API_SHARED_SECRET || '';
const INTERNAL_API_SECRET_HEADER = 'X-Internal-Api-Secret';
const INTERNAL_USER_ROLE_HEADER = 'X-Internal-User-Role';

function withDockerBackendHost(apiBase: string): string {
  try {
    const parsed = new URL(apiBase);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      parsed.hostname = 'futures-copilot-backend';
      return parsed.toString().replace(/\/$/, '');
    }
  } catch {
    // If parsing fails, just return original base.
  }
  return apiBase;
}

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || 'hello@systemsplayground.com')
    .split(',')
    .map(email => email.trim().replace(/^['\"]+|['\"]+$/g, '').toLowerCase())
    .filter(Boolean);
}

export function getSessionRole(session: Session | null): string {
  const role = ((session?.user as { role?: string } | undefined)?.role || '').trim().toUpperCase();
  if (role) {
    return role;
  }

  const email = (session?.user?.email || '').trim().toLowerCase();
  if (email && parseAdminEmails().includes(email)) {
    return 'ADMIN';
  }

  return 'ANON';
}

export async function fetchInternalBackend(path: string, init: RequestInit = {}, role?: string) {
  if (!INTERNAL_API_SHARED_SECRET) {
    throw new Error('INTERNAL_API_SHARED_SECRET is not configured');
  }

  const headers = new Headers(init.headers);
  headers.set(INTERNAL_API_SECRET_HEADER, INTERNAL_API_SHARED_SECRET);

  if (role) {
    headers.set(INTERNAL_USER_ROLE_HEADER, role.toUpperCase());
  }

  const requestInit: RequestInit = {
    ...init,
    headers,
    cache: 'no-store',
  };

  const primaryUrl = `${BACKEND_API_BASE}${path}`;

  try {
    return await fetch(primaryUrl, requestInit);
  } catch (error) {
    const fallbackBase = withDockerBackendHost(BACKEND_API_BASE);
    if (fallbackBase === BACKEND_API_BASE) {
      throw error;
    }
    return fetch(`${fallbackBase}${path}`, requestInit);
  }
}
