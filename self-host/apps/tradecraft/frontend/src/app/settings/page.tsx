import { unstable_rethrow } from "next/navigation";
import { cookies } from "next/headers";
import { getIdentities, getSettings } from "@/lib/data";
import { readSession } from "@/lib/session";
import { AccessCard } from "@/components/AccessCard";
import { CouldNotLoad } from "@/components/Notice";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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
  // every standard time zone, plus UTC which Intl lists separately on some engines
  const zones = Array.from(new Set([...Intl.supportedValuesOf("timeZone"), "UTC"])).sort();
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="title">Settings</h1>
          <p className="subtitle">Applies to the whole journal.</p>
        </div>
      </div>
      <div className="stack-md">
        <SettingsForm timeZone={settings.timeZone} zones={zones} />
        <AccessCard identities={identities} zone={settings.timeZone} stepUpAt={session?.stepUpAt ?? 0} stepUpFailed={stepUpFailed} />
      </div>
    </>
  );
}
