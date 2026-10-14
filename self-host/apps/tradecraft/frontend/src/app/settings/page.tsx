import { redirect, unstable_rethrow } from "next/navigation";
import { getSettings } from "@/lib/data";
import { CouldNotLoad } from "@/components/Notice";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

/** Settings, General: the journal time zone. Access and Integrations are pages of their own (sidebar, Settings). */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  // an old address of a failed confirmation: it belongs to the Access page now
  if (sp.stepup === "failed") redirect("/settings/access?stepup=failed");
  let settings;
  try {
    settings = await getSettings();
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
          <p className="subtitle">General. Applies to the whole journal.</p>
        </div>
      </div>
      <div className="stack-md">
        <SettingsForm timeZone={settings.timeZone} zones={zones} />
      </div>
    </>
  );
}
