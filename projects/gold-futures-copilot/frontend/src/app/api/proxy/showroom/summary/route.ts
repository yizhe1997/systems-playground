import { NextResponse } from 'next/server';

const backendBase = process.env.GOLD_COPILOT_BACKEND_URL ?? 'http://localhost:8091';

export async function GET() {
  const res = await fetch(`${backendBase}/showroom/summary`, {
    method: 'GET',
    cache: 'no-store',
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });
}
