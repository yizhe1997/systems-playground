// Signs the short-lived service token the API verifies on every call (feature 002; constitution IV). Never a bare
// shared key: 60 seconds, one audience, a random id used once. Server only.
import { SignJWT } from "jose";

export type TokenSpec = {
  /** the identity's email, or "system" for the /internal routes */
  sub: string;
  role: "owner" | "system";
  /** unix milliseconds, as given by the API at sign-in or confirmation */
  sessionAt?: number;
  stepUpAt?: number;
};

export async function signServiceToken(spec: TokenSpec): Promise<string> {
  const secret = process.env.SERVICE_TOKEN_SECRET;
  if (!secret) throw new Error("SERVICE_TOKEN_SECRET is not set");
  const claims: Record<string, unknown> = { role: spec.role };
  if (spec.sessionAt) claims.session_at = spec.sessionAt;
  if (spec.stepUpAt) claims.step_up_at = spec.stepUpAt;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(spec.sub)
    .setAudience("tradecraft-api")
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(new TextEncoder().encode(secret));
}
