import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

// NextAuth serves /api/auth/*: the Google sign-in and confirmation, the callbacks, sign-out, and its own CSRF token.
// It is a more specific route than the /api pass-through, so it is never forwarded to the API.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
