// Server-side client. It runs only in server components and route handlers, never in the browser:
// the browser talks to this web tier, and this web tier talks to the API by its internal name.
import type { ApiErrorBody } from "./types";

const base = process.env.INTERNAL_BACKEND_URL ?? "http://127.0.0.1:8081";

export class Unreachable extends Error {
  constructor() {
    super("Could not reach the journal.");
  }
}

export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
  ) {
    super(body?.message ?? `The journal answered ${status}.`);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(base + path, { cache: "no-store", ...init });
  } catch {
    throw new Unreachable();
  }
  if (!res.ok) throw new ApiFailure(res.status, await res.json().catch(() => null));
  return (await res.json()) as T;
}

/** Forwards a browser request to the API as it is (used by the /api route handler). */
export async function forward(path: string, init: RequestInit): Promise<Response> {
  try {
    const res = await fetch(base + path, { cache: "no-store", ...init });
    return new Response(await res.arrayBuffer(), {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ code: "unreachable", message: "Could not reach the journal." }, { status: 502 });
  }
}

/** A list with the total number of matches (the X-Total-Count header), for paging. */
export async function apiPaged<T>(path: string): Promise<{ data: T[]; total: number }> {
  let res: Response;
  try {
    res = await fetch(base + path, { cache: "no-store" });
  } catch {
    throw new Unreachable();
  }
  if (!res.ok) throw new ApiFailure(res.status, await res.json().catch(() => null));
  const data = (await res.json()) as T[];
  return { data, total: Number(res.headers.get("x-total-count") ?? data.length) };
}
