import { getSettings } from "@/lib/data";
import { CouldNotLoad } from "@/components/Notice";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let settings;
  try {
    settings = await getSettings();
  } catch {
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
      <SettingsForm timeZone={settings.timeZone} zones={zones} />
    </>
  );
}
