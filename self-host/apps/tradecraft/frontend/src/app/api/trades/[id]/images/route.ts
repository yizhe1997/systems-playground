// Images of a trade (feature 004). The JSON pass-through takes structured data only, so an image has a route of its own:
// raw bytes in, JSON out. Same-origin only, a session, and a size check before anything is forwarded.
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { forward, forwardRaw } from "@/lib/api";
import { isSameOrigin } from "@/lib/sameOrigin";
import { readSession } from "@/lib/session";
import { DEFAULT_LIMITS, msgTooBig } from "@/lib/imageLimits";

const refuse = (status: number, code: string, message: string) => Response.json({ code, message }, { status });
const ID = /^[0-9a-fA-F-]{36}$/;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ID.test(id)) return refuse(404, "not_found", "That does not exist.");
  const session = await readSession(await cookies());
  if (!session) return refuse(401, "unauthorized", "Not signed in.");
  return forward(`/trades/${id}/images`, { method: "GET" });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ID.test(id)) return refuse(404, "not_found", "That does not exist.");
  if (!isSameOrigin(req)) return refuse(403, "forbidden", "That request did not come from this app.");
  const session = await readSession(await cookies());
  if (!session) return refuse(401, "unauthorized", "Not signed in.");

  const max = DEFAULT_LIMITS.maxBytes;
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > max + 1024) return refuse(413, "image_too_big", msgTooBig(declared, max));
  // read the body in pieces and stop as soon as it is over the limit, whatever the header said (or did not say)
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = req.body?.getReader();
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return refuse(413, "image_too_big", msgTooBig(size, max));
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    body.set(c, at);
    at += c.byteLength;
  }

  const name = new URL(req.url).searchParams.get("name") ?? "";
  const res = await forwardRaw(
    `/trades/${id}/images${name ? `?name=${encodeURIComponent(name)}` : ""}`,
    { method: "POST", headers: { "content-type": req.headers.get("content-type") ?? "application/octet-stream" }, body },
    ["content-type"],
  );
  return res;
}
