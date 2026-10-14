import { unstable_rethrow } from "next/navigation";
import { cookies } from "next/headers";
import { getIdentities, getSettings } from "@/lib/data";
import { readSession } from "@/lib/session";
import { AccessCard } from "@/components/AccessCard";
import { CouldNotLoad } from "@/components/Notice";

export const dynamic = "force-dynamic";

/** Settings, Access: who can sign in. Changing it needs a recent Google confirmation. */
export default async function AccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const stepUpFailed = sp.stepup === "failed";
  const session = await readSession(await cookies());
  let settings;
  let identities;
  try {
    [settings, { identities }] = await Promise.all([getSettings(), getIdentities()]);
  } catch (err) {
    unstable_rethrow(err);
    return <CouldNotLoad />;
  }
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="title">Settings</h1>
          <p className="subtitle">Access. Who can sign in.</p>
        </div>
      </div>
      <div className="stack-md">
        <AccessCard identities={identities} zone={settings.timeZone} stepUpAt={session?.stepUpAt ?? 0} stepUpFailed={stepUpFailed} />
      </div>
    </>
  );
}
