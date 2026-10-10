// Prints a Cookie line for a signed-in session made without Google (local work and tests only).
//
//   DEV_SESSION_SECRET=... node scripts/dev-mint-session.mjs [email]
//
// The email defaults to OWNER_BOOTSTRAP_EMAIL. Set the printed cookie for NEXTAUTH_URL in the browser. The apps refuse
// to start with DEV_SESSION_SECRET set while TRADECRAFT_ENV is production, so this cannot be used there.
import { mintSession, sessionCookieName } from "./session-mint.mjs";

const secret = process.env.DEV_SESSION_SECRET;
const email = process.argv[2] || process.env.OWNER_BOOTSTRAP_EMAIL;
if (!secret) {
  console.error("DEV_SESSION_SECRET is required (read it from .env; never commit it).");
  process.exit(1);
}
if (!email) {
  console.error("Usage: node scripts/dev-mint-session.mjs <email>");
  process.exit(1);
}
if ((process.env.TRADECRAFT_ENV ?? "production") === "production") {
  console.error("Note: TRADECRAFT_ENV is production (or unset); the apps will refuse to start with DEV_SESSION_SECRET set.");
}
const token = await mintSession({ email, secret });
console.log(`Cookie: ${sessionCookieName(process.env.NEXTAUTH_URL)}=${token}`);
