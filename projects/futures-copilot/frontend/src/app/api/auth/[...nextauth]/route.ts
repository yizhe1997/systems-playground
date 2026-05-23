import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { fetchInternalBackend } from "@/lib/server/internal-api";

type SyncedUserPayload = {
  role?: string;
  isDisabled?: boolean;
  createdAt?: string;
};

type SessionUserExtras = {
  role?: string;
  createdAt?: string;
};

async function syncUserWithBackend(user: { id?: string | null; email?: string | null; name?: string | null }, account?: { providerAccountId?: string | null }) {
  if (!user.email) {
    return null;
  }

  const res = await fetchInternalBackend('/users/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerId: user.id || account?.providerAccountId || '',
      email: user.email,
      name: user.name || '',
    }),
  });

  if (!res.ok) {
    throw new Error(`User sync failed with status ${res.status}`);
  }

  return (await res.json()) as SyncedUserPayload;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (user && user.email) {
        try {
          const data = await syncUserWithBackend(user, account);
          if (data?.isDisabled) {
            return false; // Reject sign in
          }

          if (data?.createdAt) {
            (user as typeof user & SessionUserExtras).createdAt = data.createdAt;
          }

          if (data?.role) {
            (user as typeof user & SessionUserExtras).role = data.role;
          }
        } catch (e) {
          console.error("Failed to sync user to backend", e);
          // Proceed anyway so we don't break login if backend is restarting
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account && user?.email) {
        const authUser = user as typeof user & SessionUserExtras;

        token.createdAt = authUser.createdAt;
        token.role = authUser.role;

        if (!token.createdAt || !token.role) {
          try {
            const data = await syncUserWithBackend(user, account);
            if (data?.createdAt) {
              token.createdAt = data.createdAt;
            }
            if (data?.role) {
              token.role = data.role;
            }
          } catch (e) {
            console.error("Failed to sync user to token", e);
          }
        }
      }

      if ((!token.createdAt || !token.role) && typeof token.email === 'string' && token.email) {
        try {
          const data = await syncUserWithBackend({
            id: typeof token.sub === 'string' ? token.sub : undefined,
            email: token.email,
            name: typeof token.name === 'string' ? token.name : undefined,
          });

          if (!token.createdAt && data?.createdAt) {
            token.createdAt = data.createdAt;
          }

          if (!token.role && data?.role) {
            token.role = data.role;
          }
        } catch (e) {
          console.error("Failed to backfill user token", e);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        const sessionUser = session.user as typeof session.user & SessionUserExtras;
        if (typeof token.createdAt === 'string' && token.createdAt) {
          sessionUser.createdAt = token.createdAt;
        }

        // If they match our explicit admin email list, tag them as ADMIN.
        const adminEmails = (process.env.ADMIN_EMAILS || "hello@systemsplayground.com")
          .split(",")
          .map(email => email.trim().replace(/^['\"]+|['\"]+$/g, '').toLowerCase())
          .filter(Boolean);
        
        if (session.user.email && adminEmails.includes(session.user.email.trim().toLowerCase())) {
          sessionUser.role = "ADMIN";
        } else if (typeof token.role === 'string' && token.role) {
          sessionUser.role = token.role;
        } else {
          // Non-admin users get standard showcase access.
          sessionUser.role = "ANON";
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-dev-secret-do-not-use-in-prod",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
