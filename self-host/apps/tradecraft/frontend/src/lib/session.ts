// Reads the owner's session from NextAuth's cookie. Server only.
//
// The cookie is NextAuth's encrypted session token. NextAuth's own expiry slides with use, so the fixed eight hours
// of FR-005 is this app's own claim, `sessionAt` (given by the API's database clock at sign-in or confirmation) and
// checked here and again by the API. A cookie made with the development key (feature 002, FR-020) is accepted only
// when DEV_SESSION_SECRET is set and the app is not running as production.
import { decode } from "next-auth/jwt";

export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
export const STEP_UP_WINDOW_MS = 10 * 60 * 1000;

export type Session = { email: string; sessionAt: number; stepUpAt: number };

/** The cookie name NextAuth uses: prefixed when the address is https. */
export function sessionCookieName(): string {
  return (process.env.NEXTAUTH_URL ?? "").startsWith("https:") ? "__Secure-next-auth.session-token" : "next-auth.session-token";
}

export function isProduction(): boolean {
  const e = (process.env.TRADECRAFT_ENV ?? "").trim();
  return e === "" || e === "production";
}

/** The keys a session cookie may have been made with, the production key first. */
export function sessionSecrets(): string[] {
  const out: string[] = [];
  if (process.env.NEXTAUTH_SECRET) out.push(process.env.NEXTAUTH_SECRET);
  if (process.env.DEV_SESSION_SECRET && !isProduction()) out.push(process.env.DEV_SESSION_SECRET);
  return out;
}

/** Decodes NextAuth's cookie with each allowed key. Used by NextAuth itself (jwt.decode) and by readSession. */
export async function decodeWithKeys(token: string | undefined) {
  if (!token) return null;
  for (const secret of sessionSecrets()) {
    try {
      const t = await decode({ token, secret });
      if (t) return t;
    } catch {
      // wrong key or a damaged cookie: try the next key
    }
  }
  return null;
}

/** The session in a cookie value, or null: no cookie, damaged, another key, no times, or past the eight hours. */
export async function sessionFromToken(token: string | undefined, now = Date.now()): Promise<Session | null> {
  const t = await decodeWithKeys(token);
  if (!t) return null;
  const email = typeof t.email === "string" ? t.email.trim().toLowerCase() : "";
  const sessionAt = Number(t.sessionAt);
  const stepUpAt = Number(t.stepUpAt);
  if (!email || !Number.isFinite(sessionAt) || sessionAt <= 0) return null;
  if (now - sessionAt >= SESSION_MAX_AGE_MS) return null;
  return { email, sessionAt, stepUpAt: Number.isFinite(stepUpAt) ? stepUpAt : 0 };
}

/** The session of a request, from anything with a cookie store shape (next/headers cookies(), request.cookies). */
export async function readSession(store: { get(name: string): { value: string } | undefined }): Promise<Session | null> {
  return sessionFromToken(store.get(sessionCookieName())?.value);
}

/** Whether the last Google confirmation is recent enough to change who counts as the owner. */
export function isFreshStepUp(stepUpAt: number, now = Date.now()): boolean {
  return stepUpAt > 0 && now - stepUpAt < STEP_UP_WINDOW_MS;
}

/** A page address to return to: a single-slash path of this site, else Reviews. */
export function safeNext(next: string | null | undefined): string {
  // Browsers drop tabs and line breaks inside an address, so "/<tab>/evil.example" would become "//evil.example":
  // refuse any control character and any backslash anywhere, not only at the start.
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\u0000-\u001f\u007f\\]/.test(next)) return "/reviews";
  if (next.startsWith("/sign-in") || next.startsWith("/api/auth")) return "/reviews";
  return next;
}
