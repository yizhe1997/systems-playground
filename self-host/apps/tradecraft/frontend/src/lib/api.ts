// Server-side client. It runs only in server components and route handlers, never in the browser: the browser
// talks to this web tier, and this web tier talks to the API by its internal name. Every call carries a signed
// service token made from the owner's session (feature 002); with no session, or when the API answers 401, a page
// is sent to the sign-in screen.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { signServiceToken } from "./serviceToken";
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

const SIGN_IN_ENDED = "/sign-in?reason=ended";

/** The Authorization header for the signed-in owner, or null when there is no session. */
export async function ownerAuthorization(): Promise<Record<string, string> | null> {
  const session = await readSession(await cookies());
  if (!session) return null;
  const token = await signServiceToken({ sub: session.email, role: "owner", sessionAt: session.sessionAt, stepUpAt: session.stepUpAt });
  return { Authorization: `Bearer ${token}` };
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const auth = await ownerAuthorization();
  if (!auth) redirect(SIGN_IN_ENDED);
  let res: Response;
  try {
    res = await fetch(base + path, { cache: "no-store", ...init, headers: { ...(init?.headers as Record<string, string>), ...auth } });
  } catch {
    throw new Unreachable();
  }
  if (res.status === 401) redirect(SIGN_IN_ENDED);
  return res;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authedFetch(path, init);
  if (!res.ok) throw new ApiFailure(res.status, await res.json().catch(() => null));
  return (await res.json()) as T;
}

/** Forwards a browser request to the API (used by the /api route handler). Not signed in is a 401, not a redirect. */
export async function forward(path: string, init: RequestInit): Promise<Response> {
  const auth = await ownerAuthorization();
  if (!auth) return Response.json({ code: "unauthorized", message: "Not signed in." }, { status: 401 });
  try {
    const res = await fetch(base + path, { cache: "no-store", ...init, headers: { ...(init.headers as Record<string, string>), ...auth } });
    return new Response(await res.arrayBuffer(), {
      status: res.status,
      headers: {
        // everything here is the owner's private data (and one answer holds a token's value, once): never kept
        "cache-control": "no-store",
        "content-type": res.headers.get("content-type") ?? "application/json",
        ...(res.headers.get("content-disposition") ? { "content-disposition": res.headers.get("content-disposition")! } : {}),
      },
    });
  } catch {
    return Response.json({ code: "unreachable", message: "Could not reach the journal." }, { status: 502 });
  }
}

/** A list with the total number of matches (the X-Total-Count header), for paging. */
export async function apiPaged<T>(path: string): Promise<{ data: T[]; total: number }> {
  const res = await authedFetch(path);
  if (!res.ok) throw new ApiFailure(res.status, await res.json().catch(() => null));
  const data = (await res.json()) as T[];
  return { data, total: Number(res.headers.get("x-total-count") ?? data.length) };
}
