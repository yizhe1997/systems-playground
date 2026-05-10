import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fetchInternalBackend, getSessionRole } from '@/lib/server/internal-api';

function requireSubscriberOrAdmin(role: string): boolean {
  return role === 'SUBSCRIBER' || role === 'ADMIN';
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = getSessionRole(session);
    if (!requireSubscriberOrAdmin(role)) {
      return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
    }

    const json = await request.json();
    const res = await fetchInternalBackend(
      '/alerts/test',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...json, userEmail: session.user.email }),
      },
      role,
    );

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
