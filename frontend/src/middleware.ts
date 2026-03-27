import { withAuth } from "next-auth/middleware";

// This middleware automatically protects all routes under /admin
// If a user is not logged in, they are redirected to the signIn page defined below.
export default withAuth({
  pages: {
    signIn: "/admin/login",
  },
});

export const config = {
  // Protect all routes inside /admin EXCEPT /admin/login
  matcher: ["/admin", "/admin/((?!login).*)"],
};
