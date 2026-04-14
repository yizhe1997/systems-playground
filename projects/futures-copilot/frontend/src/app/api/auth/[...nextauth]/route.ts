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
