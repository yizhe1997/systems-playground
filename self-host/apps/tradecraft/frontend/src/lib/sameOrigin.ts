// Same-origin check for requests that change things (FR-007). Sec-Fetch-Site is sent by every modern browser and
// cannot be forged by page script, so it is the first signal; a request without it falls back to comparing Origin with
// the host. Cookies are already SameSite=Lax, which stops cross-site form posts; this also covers cross-site fetch.
import type { NextRequest } from "next/server";

export function isSameOrigin(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}
