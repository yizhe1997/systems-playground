// Same-origin pass-through so client components can reach the API without the browser ever knowing its address.
import { forward } from "@/lib/api";

async function handle(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(request.url);
  const hasBody = request.method !== "GET" && request.method !== "HEAD" && request.method !== "DELETE";
  return forward("/" + path.map(encodeURIComponent).join("/") + url.search, {
    method: request.method,
    headers: { "content-type": "application/json" },
    body: hasBody ? await request.text() : undefined,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
