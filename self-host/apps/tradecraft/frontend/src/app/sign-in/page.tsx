import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SignInCard } from "@/components/SignInCard";
import { readSession, safeNext } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in · Tradecraft" };

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SignInPage({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const next = safeNext(one(sp.next));
  // someone who is already signed in has no use for this screen
  if (await readSession(await cookies())) redirect(next);
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  // NextAuth sends any failure to /sign-in?error=...; every cause is the same refusal here
  const refused = one(sp.reason) === "refused" || Boolean(one(sp.error));
  const ended = one(sp.reason) === "ended";
  if (refused && !configured) console.error("[auth] sign-in is refused because GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set");
  return <SignInCard next={next} refused={refused} ended={ended} configured={configured} />;
}
