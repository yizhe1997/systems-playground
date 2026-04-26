import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088/api';

function withDockerBackendHost(apiBase: string): string {
  try {
    const parsed = new URL(apiBase);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      parsed.hostname = 'futures-copilot-backend';
      return parsed.toString().replace(/\/$/, '');
    }
  } catch {
    // If parsing fails, return original base.
  }

  return apiBase;
}

async function forwardStatsRequest(baseUrl: string, instrument: string) {
  const encodedInstrument = encodeURIComponent(instrument || 'ALL');
  const response = await fetch(`${baseUrl}/stats/trades?instrument=${encodedInstrument}`, {
    method: 'GET',
    cache: 'no-store',
  });

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
    },
  });
}

export async function GET(request: NextRequest) {
  const instrument = request.nextUrl.searchParams.get('instrument') || 'ALL';

  try {
    return await forwardStatsRequest(BACKEND_API_BASE, instrument);
  } catch (error) {
    const fallbackBase = withDockerBackendHost(BACKEND_API_BASE);

    if (fallbackBase !== BACKEND_API_BASE) {
      try {
        return await forwardStatsRequest(fallbackBase, instrument);
      } catch (fallbackError) {
        console.error('Stats proxy request failed on fallback backend host', fallbackError);
      }
    } else {
      console.error('Stats proxy request failed', error);
    }

    return NextResponse.json({ error: 'Failed to reach stats service' }, { status: 502 });
  }
}
