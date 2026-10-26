// One image (feature 004): its bytes for the signed-in owner, its note, and its removal. The bytes are passed on with the
// API's own headers (the type decided from the bytes, nosniff, a sandbox policy), so a browser can only display them.
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { forward, forwardRaw } from "@/lib/api";
import { isSameOrigin } from "@/lib/sameOrigin";
import { readSession } from "@/lib/session";

const refuse = (status: number, code: string, message: string) => Response.json({ code, message }, { status });
const ID = /^[0-9a-fA-F-]{36}$/;

async function checked(req: NextRequest, ctx: { params: Promise<{ id: string }> }, changes: boolean) {
  const { id } = await ctx.params;
  if (!ID.test(id)) return { fail: refuse(404, "not_found", "That does not exist.") };
  if (changes && !isSameOrigin(req)) return { fail: refuse(403, "forbidden", "That request did not come from this app.") };
  if (!(await readSession(await cookies()))) return { fail: refuse(401, "unauthorized", "Not signed in.") };
  return { id };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const c = await checked(req, ctx, false);
  if (c.fail) return c.fail;
  const download = new URL(req.url).searchParams.get("download") === "1" ? "?download=1" : "";
  const res = await forwardRaw(`/images/${c.id}${download}`, { method: "GET" }, [
    "content-type", "content-disposition", "x-content-type-options", "content-security-policy", "cache-control",
  ]);
  return res;
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const c = await checked(req, ctx, true);
  if (c.fail) return c.fail;
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return refuse(415, "unsupported", "Changes are accepted as structured data only.");
  }
  return forward(`/images/${c.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: await req.text() });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const c = await checked(req, ctx, true);
  if (c.fail) return c.fail;
  return forwardRaw(`/images/${c.id}`, { method: "DELETE" }, ["content-type"]);
}
