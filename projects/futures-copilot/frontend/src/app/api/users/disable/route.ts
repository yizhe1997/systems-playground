import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fetchInternalBackend, getSessionRole } from '@/lib/server/internal-api';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = getSessionRole(session);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (role === 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email } = await request.json();
    if (!email || email !== session.user?.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const res = await fetchInternalBackend(
      '/users/disable',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      },
      role,
    );

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
