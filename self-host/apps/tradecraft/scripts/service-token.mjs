// Prints a service token (60 seconds) for calling the API directly from a script, local use only.
//
//   SERVICE_TOKEN_SECRET=... node scripts/service-token.mjs [email]
//
// The email defaults to OWNER_BOOTSTRAP_EMAIL. It is the same token the web tier signs, so a script (seed-sample.sh,
// check-persistence.sh) can talk to the API behind the gate. The token carries a fresh sign-in and confirmation time.
import { createHmac, randomUUID } from "node:crypto";

const secret = process.env.SERVICE_TOKEN_SECRET;
const email = (process.argv[2] || process.env.OWNER_BOOTSTRAP_EMAIL || "").trim().toLowerCase();
if (!secret || !email) {
  console.error("SERVICE_TOKEN_SECRET and an email (argument or OWNER_BOOTSTRAP_EMAIL) are required.");
  process.exit(1);
}
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const at = Date.now();
const input = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
  sub: email, role: "owner", aud: "tradecraft-api", jti: randomUUID(), iat: now, exp: now + 60, session_at: at, step_up_at: at,
})}`;
console.log(`${input}.${createHmac("sha256", secret).update(input).digest("base64url")}`);
