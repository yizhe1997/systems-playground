// The front door (Next 16 "proxy", formerly middleware). A page request without a readable, unexpired session goes to
// the sign-in screen; an /api request without one is answered "not signed in". This is the cheap early refusal, not the
// authority: the API checks the identity and the session on every call, and the data layer redirects on a 401.
import { NextResponse, type NextRequest } from "next/server";
import { safeNext, sessionCookieName, sessionFromToken } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // NextAuth's own routes have to be reachable (they carry their own CSRF token)
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const cookie = req.cookies.get(sessionCookieName())?.value;
  const session = await sessionFromToken(cookie);

  if (pathname === "/sign-in") {
    if (session) return NextResponse.redirect(new URL(safeNext(req.nextUrl.searchParams.get("next")), req.url));
    return NextResponse.next();
  }
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ code: "unauthorized", message: "Not signed in." }, { status: 401 });
  }
  const to = req.nextUrl.clone();
  to.pathname = "/sign-in";
  to.search = "";
  if (cookie) to.searchParams.set("reason", "ended"); // a cookie that no longer counts: say so
  to.searchParams.set("next", pathname + search);
  return NextResponse.redirect(to);
}

export const config = {
  // everything except Next's own static files and the icons
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)"],
};
