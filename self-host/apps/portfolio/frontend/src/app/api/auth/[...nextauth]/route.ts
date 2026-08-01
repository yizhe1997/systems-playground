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
    async jwt({ token, user }) {
      // 1. This block runs the first time they log in
      if (user && user.email) {
        const roleFromDevLogin = (user as { role?: string }).role;
        if (roleFromDevLogin) {
          // Only ever set by the dev-login credentials provider above, which
          // only exists when devLoginEnabled is true - trust it directly
          // rather than re-deriving from ADMIN_EMAILS.
          token.role = roleFromDevLogin;
          return token;
        }

        const whitelistedEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());

        // 2. Inject their RBAC role into the JWT token payload
        if (whitelistedEmails.includes(user.email.toLowerCase())) {
          token.role = "admin";
        } else {
          token.role = "viewer";
          console.log(`[Auth] Issued Read-Only 'viewer' token to: ${user.email}`);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // 3. This block exposes the JWT payload to the Next.js React components
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
