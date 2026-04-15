import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (user && user.email) {
        try {
          const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8088/api/copilot';
          const res = await fetch(`${API_BASE}/users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              providerId: user.id || account?.providerAccountId || '',
              email: user.email,
              name: user.name || '',
            }),
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.isDisabled) {
              return false; // Reject sign in
            }
          }
        } catch (e) {
          console.error("Failed to sync user to backend", e);
          // Proceed anyway so we don't break login if backend is restarting
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user) {
        // If they match our explicit admin email list, tag them as ADMIN.
        const adminEmails = (process.env.ADMIN_EMAILS || "hello@systemsplayground.com").split(",");
        
        if (session.user.email && adminEmails.includes(session.user.email.toLowerCase())) {
          (session.user as any).role = "ADMIN";
        } else {
          // Everyone else is just an ANON for now until they buy a sub
          (session.user as any).role = "ANON";
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
