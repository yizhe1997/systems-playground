import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
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
    async signIn({ user }) {
      // 1. If ADMIN_EMAILS isn't set, block everyone by default for safety
      if (!process.env.ADMIN_EMAILS) {
        console.warn("ADMIN_EMAILS environment variable is not set. Blocking all logins.");
        return false;
      }

      // 2. Parse the whitelisted emails (e.g. "yizhe1997@gmail.com,admin@company.com")
      const whitelistedEmails = process.env.ADMIN_EMAILS.split(",").map(e => e.trim().toLowerCase());
      
      // 3. Check if the logged-in Google email is in the whitelist
      if (user.email && whitelistedEmails.includes(user.email.toLowerCase())) {
        return true; // Login successful!
      }

      // 4. If not on the list, reject them immediately
      console.warn(`Unauthorized login attempt from: ${user.email}`);
      return false; // Redirects them to an "Access Denied" page
    },
  },
  pages: {
    signIn: "/admin/login", // We'll build a custom login page later
  },
});

export { handler as GET, handler as POST };
