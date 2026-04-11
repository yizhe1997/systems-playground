import { NextRequest, NextResponse } from 'next/server';

const backendBase = process.env.GOLD_COPILOT_BACKEND_URL ?? 'http://localhost:8091';

export async function POST(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ code: 'BAD_REQUEST', message: 'id query param is required' }, { status: 400 });
  }

  const payload = await req.text();
  const res = await fetch(`${backendBase}/creator/trade-plans/${id}/retrospective`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Role': 'creator',
    },
    body: payload,
    cache: 'no-store',
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });
}
