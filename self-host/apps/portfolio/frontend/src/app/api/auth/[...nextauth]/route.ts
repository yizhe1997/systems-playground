import NextAuth, { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Extend the built-in session type so TS knows about our custom role
declare module "next-auth" {
  interface Session {
    user: {
      role?: string;
    } & DefaultSession["user"];
  }
}

const providers: NextAuthOptions["providers"] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  }),
];

// Dev-only passwordless admin sign-in, for local UI work when Google OAuth
// isn't practical (e.g. an agent verifying admin-only screens). NEXT_PUBLIC_
// vars are readable server-side too, so one flag drives both the provider
// registration here and the button visibility on the login page. Still
// double-gated: the flag AND a hard NODE_ENV!==production check, so this can
// never activate in a real deployment even if the flag were left set by
// accident. Never weakens the Google path - it's a separate, additional
// provider, not a bypass of the existing one.
const devLoginEnabled = process.env.NEXT_PUBLIC_DEV_LOGIN_ENABLED === "true" && process.env.NODE_ENV !== "production";
if (devLoginEnabled) {
  console.warn("[Auth] ⚠️  DEV_LOGIN_ENABLED is on - a passwordless dev-admin sign-in is registered. This must never be set in production.");
  providers.push(
    CredentialsProvider({
      id: "dev-login",
      name: "Dev Login (local only)",
      credentials: {},
      async authorize() {
        // No password check by design - gated entirely by devLoginEnabled above.
        return { id: "dev-admin", email: "dev-admin@localhost", name: "Dev Admin", role: "admin" } as never;
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Hard gate: this app has admin-only pages with sensitive data, not a
    // public read-only mode, so anyone outside ADMIN_EMAILS is rejected here
    // - before a session/cookie ever exists - rather than let them sign in
    // and gate access afterward. Returning false makes NextAuth redirect to
    // the sign-in page with an error, no partial/viewer session created.
    async signIn({ user, account }) {
      // dev-login is a separate, local-only provider - already double-gated
      // by devLoginEnabled + NODE_ENV up top, not a bypass of this check.
      if (account?.provider === "dev-login") return true;

      const whitelistedEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
      if (!user.email || !whitelistedEmails.includes(user.email.toLowerCase())) {
        console.log(`[Auth] Rejected sign-in from non-admin email: ${user.email}`);
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      // signIn above already guarantees only admins (or the dev-login user)
      // ever reach here, so there's no ADMIN_EMAILS re-check or "viewer"
      // branch needed - every session that exists at all is an admin session.
      if (user && user.email) {
        const roleFromDevLogin = (user as { role?: string }).role;
        token.role = roleFromDevLogin || "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
