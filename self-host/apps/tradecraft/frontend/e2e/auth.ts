import { tmpdir } from "node:os";
import { join } from "node:path";
import { mintSession, sessionCookieName } from "../scripts/session-mint.mjs";

/** The owner identity of the test stack (the API creates it from OWNER_BOOTSTRAP_EMAIL at start). */
export const OWNER_EMAIL = (process.env.OWNER_BOOTSTRAP_EMAIL ?? "owner@example.com").trim().toLowerCase();

/** Where the signed-in browser state is written: outside the repository. */
export const STORAGE_STATE = join(tmpdir(), "tradecraft-e2e-state.json");

/** A browser cookie for any identity, made without Google. For specs that sign out or disable an identity. */
export async function cookieFor(email: string, over: { sessionAt?: number; stepUpAt?: number } = {}) {
  const base = new URL(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3101");
  return {
    name: sessionCookieName(base.origin),
    value: await mintSession({ email, secret: process.env.DEV_SESSION_SECRET, ...over }),
    domain: base.hostname,
    path: "/",
    httpOnly: true,
    secure: base.protocol === "https:",
    sameSite: "Lax" as const,
  };
}
