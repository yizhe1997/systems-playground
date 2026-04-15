import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const { email } = await request.json();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8088/api/copilot';
    
    const res = await fetch(`${backendUrl}/users/disable`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Backend failed to disable user' }, { status: 500 });
    }

    return NextResponse.json({ status: 'disabled' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}