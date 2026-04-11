import { NextRequest, NextResponse } from 'next/server';

const backendBase = process.env.GOLD_COPILOT_BACKEND_URL ?? 'http://localhost:8091';

export async function POST(req: NextRequest) {
  const payload = await req.json();

  const subscriberUserId = payload.subscriberUserId ?? 'demo-subscriber';
  const res = await fetch(`${backendBase}/subscriber/alert-channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Subscriber-Tier': 'paid',
      'X-Subscriber-Status': 'active',
      'X-Subscriber-User-Id': subscriberUserId,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });
}
