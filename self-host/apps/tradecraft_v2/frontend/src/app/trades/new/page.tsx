import { redirect } from "next/navigation";
import { getAccounts, getSettings } from "@/lib/data";
import { zoneName } from "@/lib/format";
import { CouldNotLoad } from "@/components/Notice";
import { TradeForm } from "@/components/TradeForm";

export const dynamic = "force-dynamic";

export default async function NewTradePage() {
  let accounts, settings;
  try {
    [accounts, settings] = await Promise.all([getAccounts(false), getSettings()]);
  } catch {
    return <CouldNotLoad />;
  }
  // a trade needs an active account; the direct address of this page goes to Accounts until there is one
  if (accounts.length === 0) redirect("/accounts?new=1");
  return <TradeForm accounts={accounts} zone={settings.timeZone} zoneLabel={zoneName(settings.timeZone)} />;
}
