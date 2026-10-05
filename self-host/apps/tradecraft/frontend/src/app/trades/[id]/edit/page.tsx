import { notFound } from "next/navigation";
import { ApiFailure } from "@/lib/api";
import { getAccounts, getSettings, getTrade } from "@/lib/data";
import { zoneName } from "@/lib/format";
import { CouldNotLoad } from "@/components/Notice";
import { TradeForm } from "@/components/TradeForm";

export const dynamic = "force-dynamic";

export default async function EditTradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let trade, accounts, settings;
  try {
    [trade, accounts, settings] = await Promise.all([getTrade(id), getAccounts(true), getSettings()]);
  } catch (e) {
    if (e instanceof ApiFailure && e.status === 404) notFound();
    return <CouldNotLoad />;
  }
  // the account chooser lists active accounts, and the trade's own account even when it is archived
  const choices = accounts.filter((a) => !a.archived || a.id === trade.accountId);
  // keyed on the version so "Reload" after a conflict starts the form again from the latest copy
  return <TradeForm key={trade.updatedAt} accounts={choices} zone={settings.timeZone} zoneLabel={zoneName(settings.timeZone)} trade={trade} />;
}
