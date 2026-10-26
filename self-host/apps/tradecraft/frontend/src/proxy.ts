// The front door (Next 16 "proxy", formerly middleware). A page request without a readable, unexpired session goes to
// the sign-in screen; an /api request without one is answered "not signed in". This is the cheap early refusal, not the
// authority: the API checks the identity and the session on every call, and the data layer redirects on a 401.
// It also sets the Content-Security-Policy of every response, with a fresh nonce for the scripts Next puts in a page.
import { NextResponse, type NextRequest } from "next/server";
import { safeNext, sessionCookieName, sessionFromToken } from "@/lib/session";

// Scripts run only with this request's nonce ('strict-dynamic' lets those scripts load their own chunks). Styles allow
// inline because React writes style attributes. Nothing may load from, post to or be framed by another origin, except
// that a form may go on to Google (the sign-in redirect).
function policy(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
  ].join("; ");
}

export async function proxy(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = policy(nonce, process.env.NODE_ENV !== "production");
  // CSP_REPORT_ONLY=1 reports violations in the browser console without blocking: for trying a change on a real host
  const header = process.env.CSP_REPORT_ONLY === "1" ? "content-security-policy-report-only" : "content-security-policy";
  const forward = new Headers(req.headers);
  forward.set("x-nonce", nonce);
  forward.set(header, csp); // Next reads the nonce from the request header and puts it on its own scripts
  const res = await gate(req, forward);
  // An image is not a page: its own policy (a sandbox with nothing allowed, set by the route) must reach the browser
  // unchanged, so the app's page policy is not laid over it (feature 004).
  if (/^\/api\/images\/[^/]+$/.test(req.nextUrl.pathname)) res.headers.set("content-security-policy", "default-src 'none'; sandbox");
  else res.headers.set(header, csp);
  return res;
}

async function gate(req: NextRequest, forward: Headers): Promise<NextResponse> {
  const next = () => NextResponse.next({ request: { headers: forward } });
  const { pathname, search } = req.nextUrl;
  // NextAuth's own routes have to be reachable (they carry their own CSRF token)
  if (pathname.startsWith("/api/auth/")) return next();
  // The agent door: not a page and not the owner's session. next.config.ts passes it to the API, whose agent gate
  // checks the token; an owner cookie is neither needed nor looked at.
  if (pathname === "/mcp") return next();

  const cookie = req.cookies.get(sessionCookieName())?.value;
  const session = await sessionFromToken(cookie);

  if (pathname === "/sign-in") {
    // A cookie that still looks fine here can be one the API has refused (signed out elsewhere, identity disabled):
    // after "ended" or "refused" the sign-in screen must show, or the two would redirect to each other for ever.
    const why = req.nextUrl.searchParams.get("reason");
    if (session && why !== "ended" && why !== "refused") {
      return NextResponse.redirect(new URL(safeNext(req.nextUrl.searchParams.get("next")), req.url));
    }
    return next();
  }
  if (session) return next();

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
