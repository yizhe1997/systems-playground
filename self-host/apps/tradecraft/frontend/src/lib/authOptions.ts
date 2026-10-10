// NextAuth options (feature 002; research.md section 2). Google is the only way in, for the addresses the owner has
// allowed. The decision is the API's: the signIn callback asks it (a system token, server to server) and puts the
// times it answers on the session, so the fixed eight hours and the confirmation time are the API's own database clock.
//
// Two provider ids use the same Google client: `google` is the sign-in, `google-confirm` is the "Confirm it's you"
// step-up (the account chooser again, and it must be the same Google account as the one signed in).
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";
import { decodeWithKeys, readSession, SESSION_MAX_AGE_MS } from "./session";
import { signServiceToken } from "./serviceToken";

declare module "next-auth/jwt" {
  interface JWT {
    sessionAt?: number;
    stepUpAt?: number;
  }
}

const BACKEND = process.env.INTERNAL_BACKEND_URL ?? "http://backend:8080";
const REFUSED = "/sign-in?reason=refused";
const ENDED = "/sign-in?reason=ended";
const STEP_UP_FAILED = "/settings?stepup=failed";

type SessionTimes = { email: string; sessionAt: number; stepUpAt: number };

/** Calls one of the API's /internal routes with a system token. Returns the parsed body, or null when it said no. */
async function internal(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: unknown }> {
  const token = await signServiceToken({ sub: "system", role: "system" });
  const res = await fetch(BACKEND + path, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(8000), // fail closed rather than hang the sign-in
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

function google(id: "google" | "google-confirm") {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  return GoogleProvider({
    id,
    clientId,
    clientSecret,
    ...(id === "google-confirm" ? { authorization: { params: { prompt: "select_account" } } } : {}),
  } as Parameters<typeof GoogleProvider>[0]);
}

export const authOptions: NextAuthOptions = {
  providers: [google("google"), google("google-confirm")],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_MS / 1000 },
  jwt: {
    maxAge: SESSION_MAX_AGE_MS / 1000,
    // the production key, and the development key only when it is configured and this is not production
    decode: ({ token }) => decodeWithKeys(token),
  },
  pages: { signIn: "/sign-in", error: "/sign-in?reason=refused" },
  callbacks: {
    async signIn({ user, account, profile }) {
      const provider = account?.provider;
      if ((provider !== "google" && provider !== "google-confirm") || !account || !user.email) return REFUSED;
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error("[auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set; refusing the sign-in");
        return REFUSED;
      }
      const subject = account.providerAccountId;
      try {
        if (provider === "google") {
          const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified === true;
          const r = await internal("/internal/sign-in", { email: user.email, providerSub: subject, emailVerified: verified });
          if (!r.ok) return REFUSED;
          Object.assign(user, { tc: r.data as SessionTimes });
          return true;
        }
        // the confirmation: only for someone who is signed in, and only as the same Google account
        const current = await readSession(await cookies());
        if (!current) return ENDED;
        const r = await internal("/internal/step-up", { email: current.email, providerSub: subject });
        if (!r.ok) return r.status === 403 ? STEP_UP_FAILED : STEP_UP_FAILED;
        Object.assign(user, { tc: r.data as SessionTimes });
        return true;
      } catch (err) {
        // an unreachable API must never let a sign-in through
        console.error("[auth] the API could not be asked:", err instanceof Error ? err.message : "unknown error");
        return provider === "google" ? REFUSED : STEP_UP_FAILED;
      }
    },
    async jwt({ token, user }) {
      // `user` is present only at sign-in or confirmation; carry the API's times and email onto the cookie
      const tc = (user as { tc?: SessionTimes } | undefined)?.tc;
      if (tc) {
        token.email = tc.email;
        token.sessionAt = tc.sessionAt;
        token.stepUpAt = tc.stepUpAt;
      }
      return token;
    },
  },
  events: {
    // ends every session of the identity at the API, so a copy of the cookie stops working too (FR-005)
    async signOut({ token }) {
      if (!token?.email) return;
      try {
        await internal("/internal/sign-out", { email: token.email });
      } catch (err) {
        console.error("[auth] sign-out could not be recorded:", err instanceof Error ? err.message : "unknown error");
      }
    },
  },
};
