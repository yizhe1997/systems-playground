// Used by client components. Calls this web tier's /api pass-through, never the API itself.
import type { ApiErrorBody } from "./types";

export type CallResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ApiErrorBody; unreachable: boolean };

export async function call<T>(method: string, path: string, body?: unknown): Promise<CallResult<T>> {
  let res: Response;
  try {
    res = await fetch("/api" + path, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, unreachable: true, error: { code: "unreachable", message: "Could not reach the journal." } };
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const unreachable = res.status === 502 || res.status === 0;
    return { ok: false, status: res.status, unreachable, error: data ?? { code: "error", message: "Something went wrong." } };
  }
  return { ok: true, status: res.status, data: data as T };
}
