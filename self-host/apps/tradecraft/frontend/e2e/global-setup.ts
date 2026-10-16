import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mintSession, sessionCookieName } from "../scripts/session-mint.mjs";
import { OWNER_EMAIL, STORAGE_STATE } from "./auth";

// Signs the browser in once, as the owner identity, without Google (US4): a cookie made with DEV_SESSION_SECRET, which
// the composed test stack accepts because it runs with TRADECRAFT_ENV=test. The state file lives outside the
// repository (the system temp folder).
export default async function globalSetup() {
  const secret = process.env.DEV_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "DEV_SESSION_SECRET is not set. Run the browser tests through ./scripts/test.sh, which starts a stack that accepts a minted session.",
    );
  }
  const base = new URL(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100");
  const value = await mintSession({ email: OWNER_EMAIL, secret });
  const state = {
    cookies: [
      {
        name: sessionCookieName(base.origin),
        value,
        domain: base.hostname,
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
        httpOnly: true,
        secure: base.protocol === "https:",
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  writeFileSync(STORAGE_STATE, JSON.stringify(state));
}
