import NextAuth, { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Extend the built-in session type so TS knows about our custom role
declare module "next-auth" {
  interface Session {
    user: {
      role?: string;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // 1. This block runs the first time they log in
      if (user && user.email) {
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
