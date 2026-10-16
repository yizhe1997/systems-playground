// Same-origin pass-through so client components can reach the API without the browser ever knowing its address.
// The browser reaches only an allow-list of the API's paths: the /internal routes (sign-in decisions, sign-out,
// step-up) are for web-tier code alone, and /api/auth/* is NextAuth's own route and never gets here.
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { forward } from "@/lib/api";
import { isSameOrigin } from "@/lib/sameOrigin";
import { isFreshStepUp, readSession } from "@/lib/session";

const ALLOWED = new Set([
  "accounts", "trades", "reviews", "weekly", "focus", "mistakes", "settings", "currencies", "export", "identities", "audit",
  "agent",
]);
const SEGMENT = /^[A-Za-z0-9_-]+$/;

const refuse = (status: number, code: string, message: string) => Response.json({ code, message }, { status });

async function handle(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!path.length || !ALLOWED.has(path[0]) || !path.every((s) => SEGMENT.test(s))) {
    return refuse(404, "not_found", "That does not exist.");
  }
  const method = request.method;
  const changes = method !== "GET" && method !== "HEAD";
  // changes, and the export (it writes an audit entry), only from this app's own pages
  if ((changes || path[0] === "export") && !isSameOrigin(request)) {
    return refuse(403, "forbidden", "That request did not come from this app.");
  }
  const session = await readSession(await cookies());
  if (!session) return refuse(401, "unauthorized", "Not signed in.");
  // identity changes and agent access changes need a Google confirmation within the last 10 minutes; the API checks it too
  if (changes && (path[0] === "identities" || path[0] === "agent") && !isFreshStepUp(session.stepUpAt)) {
    return refuse(403, "step_up_required", "A recent Google confirmation is needed first. Nothing was changed.");
  }
  const hasBody = method !== "GET" && method !== "HEAD" && method !== "DELETE";
  const body = hasBody ? await request.text() : undefined;
  if (body && !(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return refuse(415, "unsupported", "Changes are accepted as structured data only.");
  }
  const search = new URL(request.url).search;
  return forward("/" + path.map(encodeURIComponent).join("/") + search, {
    method,
    headers: { "content-type": "application/json" },
    body: body === "" ? undefined : body,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
