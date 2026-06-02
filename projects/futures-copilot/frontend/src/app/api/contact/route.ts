import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { fetchInternalBackend } from '@/lib/server/internal-api';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = (await request.json()) as {
      message?: string;
      company?: string;
      recaptchaToken?: string;
    };

    const contactName = session.user.name || session.user.email?.split('@')[0] || 'Authenticated User';

    const body = JSON.stringify({
      name: contactName,
      email: session.user.email,
      subject: `Futures Copilot enquiry from ${session.user.email}`,
      message: json.message || '',
      company: json.company || '',
      recaptchaToken: json.recaptchaToken || '',
    });

    const res = await fetchInternalBackend('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const responseBody = await res.text();
    return new NextResponse(responseBody, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to send your message right now. Please try again later.' },
      { status: 500 },
    );
  }
}
