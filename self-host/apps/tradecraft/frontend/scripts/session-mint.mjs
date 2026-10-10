// Makes a signed-in session without Google, for tests and for working on screens locally (feature 002, US4).
//
// There is no route, provider or switch in the app that creates a session without Google. A session made here is a
// NextAuth cookie encrypted with DEV_SESSION_SECRET, a second key the web tier accepts only when that variable is set
// and TRADECRAFT_ENV is not production; both tiers refuse to start in production with it present.
import { encode } from "next-auth/jwt";
import { createHmac, randomUUID } from "node:crypto";

const EIGHT_HOURS = 8 * 60 * 60;

/** The NextAuth cookie value for an identity. sessionAt and stepUpAt are unix milliseconds (now by default). */
export async function mintSession({ email, secret, sessionAt = Date.now(), stepUpAt = sessionAt }) {
  if (!secret) throw new Error("DEV_SESSION_SECRET is not set (read it from .env; never commit it)");
  const address = email.trim().toLowerCase();
  return encode({
    secret,
    maxAge: EIGHT_HOURS,
    token: { sub: address, email: address, name: address, sessionAt, stepUpAt },
  });
}

/** NextAuth's cookie name for an origin: prefixed when https. */
export function sessionCookieName(origin) {
  return (origin ?? "").startsWith("https:") ? "__Secure-next-auth.session-token" : "next-auth.session-token";
}

const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

/** A service token for the API (HS256, 60 s), as the web tier signs it. For tests and local scripts. */
export function serviceToken({ sub, secret, role = "owner", sessionAt, stepUpAt }) {
  if (!secret) throw new Error("SERVICE_TOKEN_SECRET is not set");
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub, role, aud: "tradecraft-api", jti: randomUUID(), iat: now, exp: now + 60 };
  if (role === "owner") {
    const at = Date.now();
    claims.session_at = sessionAt ?? at;
    claims.step_up_at = stepUpAt ?? at;
  }
  const input = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(claims)}`;
  return `${input}.${createHmac("sha256", secret).update(input).digest("base64url")}`;
}
